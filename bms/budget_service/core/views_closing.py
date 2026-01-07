from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q # Added Q
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

class YearEndClosingPreviewView(APIView):
    permission_classes = [IsBMSFinanceHead]

    @extend_schema(
        tags=['Fiscal Year Management'],
        summary="Preview Year-End Closing Data",
        description="Calculates remaining budgets for all allocations in the closing year to assist in carry-over decisions.",
        parameters=[
            OpenApiParameter(name="closing_year_id", type=int, required=True, description="ID of the Fiscal Year to close"),
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
        responses={200: OpenApiResponse(description="Closing process completed successfully")}
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
            # 1. Prepare Journal Entry for the Carryover Batch
            # We need a source account (Equity/Retained Earnings) to balance the ledger
            equity_account = Account.objects.filter(
                Q(account_type__name='Equity') | Q(name__icontains='Retained Earnings') | Q(name__icontains='Fund Balance')
            ).first()
            
            # Fallback if no equity account exists (prevents crash, though setup should have one)
            if not equity_account:
                equity_account = Account.objects.filter(is_active=True).first()

            # Create the Parent Journal Entry
            je = JournalEntry.objects.create(
                date=opening_fy.start_date, # Date is start of NEW fiscal year
                category='PROJECTS', # or 'OPENING_BALANCE'
                description=f"Opening Balance Carryover from {closing_fy.name}",
                total_amount=Decimal('0.00'), # Will update later
                status='POSTED',
                created_by_user_id=user.id,
                created_by_username=getattr(user, 'username', 'N/A')
            )

            old_allocations = BudgetAllocation.objects.filter(
                fiscal_year=closing_fy,
                is_active=True
            ).select_related('department', 'category', 'account', 'project')

            for old_alloc in old_allocations:
                # Calculate Remaining
                total_spent = Expense.objects.filter(
                    budget_allocation=old_alloc,
                    status='APPROVED'
                ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
                
                remaining = old_alloc.amount - total_spent

                if remaining <= 0:
                    continue 

                if old_alloc.id in selected_ids:
                    # --- CARRY OVER LOGIC ---
                    
                    # A. Create/Get New Allocation
                    new_alloc, created = BudgetAllocation.objects.get_or_create(
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

                    # B. Create Audit Log (BudgetTransfer)
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
                        approval_date=transaction.get_connection().ops.value_to_db_datetime(transaction.get_connection().ops.last_executed_query)
                    )

                    # C. Create Journal Entry Lines (Ledger)
                    # Debit: Increase expense allocation capability (Logic: Budget Entry)
                    JournalEntryLine.objects.create(
                        journal_entry=je,
                        account=old_alloc.account, # The specific expense account
                        transaction_type='DEBIT', 
                        journal_transaction_type='TRANSFER',
                        amount=remaining,
                        description=f"Carryover to {old_alloc.department.code} - {old_alloc.category.name}",
                        expense_category=old_alloc.category
                    )

                    processed_count += 1
                    total_carryover_amount += remaining
                else:
                    expired_count += 1

            # Update Journal Entry Totals and create balancing Credit line
            if total_carryover_amount > 0:
                je.total_amount = total_carryover_amount
                je.save()

                # Credit: Equity/Fund Balance (Source of funds)
                JournalEntryLine.objects.create(
                    journal_entry=je,
                    account=equity_account,
                    transaction_type='CREDIT',
                    journal_transaction_type='TRANSFER',
                    amount=total_carryover_amount,
                    description=f"Total Carryover from {closing_fy.name}",
                    expense_category=None
                )
            else:
                # If nothing carried over, delete the empty draft JE
                je.delete()

            # Lock the Old Year
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