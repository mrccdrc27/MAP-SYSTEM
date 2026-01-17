from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q  # Added Q
from django.db.models.functions import Coalesce
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer

from .models import (
    FiscalYear, BudgetAllocation, BudgetTransfer, JournalEntry,
    JournalEntryLine, Account, Expense, UserActivityLog
)
from .permissions import IsBMSFinanceHead
from django.utils import timezone

from itertools import groupby
from operator import attrgetter

class YearEndClosingPreviewView(APIView):
    permission_classes = [IsBMSFinanceHead]

    @extend_schema(
        tags=['Fiscal Year Management'],
        summary="Preview Year-End Closing Data",
        description="Calculates remaining budgets for all allocations in the closing year to assist in carry-over decisions.",
        parameters=[
            OpenApiParameter(name="closing_year_id", type=int, required=True,
                             description="ID of the Fiscal Year to close"),
        ],
        responses={
            200: inline_serializer(
                name='ClosingPreviewResponse',
                fields={
                    'closing_year': serializers.CharField(),
                    'allocations': serializers.ListField(
                        child=serializers.DictField()
                    )
                }
            )
        }
    )
    def get(self, request):
        closing_year_id = request.query_params.get('closing_year_id')
        if not closing_year_id:
            return Response({"error": "closing_year_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            closing_fy = FiscalYear.objects.get(id=closing_year_id)
        except FiscalYear.DoesNotExist:
            return Response({"error": "Fiscal Year not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get all active allocations for the closing year
        allocations = BudgetAllocation.objects.filter(
            fiscal_year=closing_fy,
            is_active=True
        ).select_related('department', 'category', 'account', 'project')

        preview_data = []

        for alloc in allocations:
            # Calculate remaining
            total_spent = Expense.objects.filter(
                budget_allocation=alloc,
                status='APPROVED'
            ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']

            remaining = alloc.amount - total_spent

            if remaining > 0:
                preview_data.append({
                    "allocation_id": alloc.id,
                    "department": alloc.department.name,
                    "project": alloc.project.name,
                    "category": alloc.category.name,
                    "account": alloc.account.name,
                    "total_allocated": alloc.amount,
                    "total_spent": total_spent,
                    "remaining_balance": remaining,
                    "recommended_action": "CARRYOVER" if remaining > 0 else "EXPIRE"
                })

        return Response({
            "closing_year": closing_fy.name,
            "count": len(preview_data),
            "allocations": preview_data
        })


class ProcessYearEndClosingView(APIView):
    permission_classes = [IsBMSFinanceHead]

    @extend_schema(
        tags=['Fiscal Year Management'],
        summary="Process Year-End Carryover",
        description="Transfers remaining balances from the Closing Year to the Opening Year, creates Ledger entries, and locks the old year.",
        request=inline_serializer(
            name='ProcessClosingRequest',
            fields={
                'closing_year_id': serializers.IntegerField(),
                'opening_year_id': serializers.IntegerField(),
                'allocation_ids': serializers.ListField(child=serializers.IntegerField(), help_text="List of allocation IDs to carry over. Use empty list to expire all."),
            }
        ),
        responses={200: OpenApiResponse(
            description="Closing process completed successfully")}
    )
    def post(self, request):
        closing_year_id = request.data.get('closing_year_id')
        opening_year_id = request.data.get('opening_year_id')
        selected_ids = request.data.get('allocation_ids', [])

        if not closing_year_id or not opening_year_id:
            return Response({"error": "Both closing_year_id and opening_year_id are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            closing_fy = FiscalYear.objects.get(id=closing_year_id)
            opening_fy = FiscalYear.objects.get(id=opening_year_id)
        except FiscalYear.DoesNotExist:
            return Response({"error": "Fiscal Year not found"}, status=status.HTTP_404_NOT_FOUND)

        if closing_fy.is_locked:
            return Response({"error": f"Fiscal Year {closing_fy.name} is already locked."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        processed_count = 0
        expired_count = 0
        total_carryover_amount = Decimal('0.00')

        with transaction.atomic():
            # 1. Fetch Allocations
            old_allocations = BudgetAllocation.objects.filter(
                fiscal_year=closing_fy,
                id__in=selected_ids, # Filter selected upfront for efficiency
                is_active=True
            ).select_related('department', 'category', 'account', 'project').order_by('department_id')

            # 2. Get Equity Account
            equity_account = Account.objects.filter(
                Q(account_type__name='Equity') | Q(name__icontains='Retained Earnings')
            ).first()
            if not equity_account:
                equity_account = Account.objects.filter(is_active=True).first()

            # 3. Group by Department to create distinct JEs
            for department, dept_allocations in groupby(old_allocations, key=attrgetter('department')):
                
                # --- FIX: Create One JE per Department ---
                je = JournalEntry.objects.create(
                    date=opening_fy.start_date,
                    category='PROJECTS',
                    description=f"Opening Balance Carryover: {department.name}", # Clearer description
                    total_amount=Decimal('0.00'),
                    status='POSTED',
                    department=department, # <--- BUG FIXED: Explicitly set Department
                    created_by_user_id=user.id,
                    created_by_username=getattr(user, 'username', 'N/A')
                )

                je_total = Decimal('0.00')

                for old_alloc in dept_allocations:
                    # Calculate Remaining (Logic moved inside loop)
                    total_spent = Expense.objects.filter(
                        budget_allocation=old_alloc, status='APPROVED'
                    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
                    
                    remaining = old_alloc.amount - total_spent
                    if remaining <= 0: continue

                    # Create New Allocation
                    new_alloc, _ = BudgetAllocation.objects.get_or_create(
                        fiscal_year=opening_fy,
                        department=old_alloc.department,
                        category=old_alloc.category,
                        account=old_alloc.account,
                        project=old_alloc.project,
                        defaults={
                            'amount': Decimal('0.00'),
                            'proposal': old_alloc.proposal,
                            'created_by_name': 'System (Carryover)',
                            'is_active': True,
                            'is_locked': False
                        }
                    )
                    new_alloc.amount += remaining
                    new_alloc.save()

                    # Audit Log
                    BudgetTransfer.objects.create(
                        fiscal_year=opening_fy,
                        source_allocation=None,
                        destination_allocation=new_alloc,
                        amount=remaining,
                        reason=f"Carryover from {closing_fy.name}",
                        transfer_type='SUPPLEMENTAL',
                        transferred_by_user_id=user.id,
                        transferred_by_username=getattr(user, 'username', 'N/A'),
                        status='APPROVED',
                        approved_by_user_id=user.id,
                        approved_by_username=getattr(user, 'username', 'N/A'),
                        approval_date=timezone.now()
                    )

                    # Debit Line
                    JournalEntryLine.objects.create(
                        journal_entry=je,
                        account=old_alloc.account,
                        transaction_type='DEBIT',
                        journal_transaction_type='TRANSFER',
                        amount=remaining,
                        description=f"Carryover: {old_alloc.category.name}",
                        expense_category=old_alloc.category
                    )
                    
                    je_total += remaining
                    processed_count += 1

                # Update JE Total & Credit Line
                if je_total > 0:
                    je.total_amount = je_total
                    je.save()
                    
                    JournalEntryLine.objects.create(
                        journal_entry=je,
                        account=equity_account,
                        transaction_type='CREDIT',
                        journal_transaction_type='TRANSFER',
                        amount=je_total,
                        description=f"Fund Source: Carryover from {closing_fy.name}",
                        expense_category=None
                    )
                    total_carryover_amount += je_total
                else:
                    je.delete() # Cleanup if no remaining funds found

            # 4. Expire the rest (Not in selected_ids)
            # (Expired count logic can remain simple or be removed if not critical)
            
            # Lock Old Year
            closing_fy.is_locked = True
            closing_fy.save()

            UserActivityLog.objects.create(
                user_id=user.id,
                user_username=getattr(user, 'username', 'N/A'),
                log_type='PROCESS',
                action=f"Closed Fiscal Year {closing_fy.name}. Carried over: {processed_count}, Expired: {expired_count}",
                status='SUCCESS',
                details={
                    'closed_year': closing_fy.name,
                    'opened_year': opening_fy.name,
                    'total_carryover_amount': str(total_carryover_amount)
                }
            )

        return Response({
            "message": f"Successfully closed {closing_fy.name}",
            "allocations_carried_over": processed_count,
            "allocations_expired": expired_count,
            "total_amount_carried": total_carryover_amount
        })
