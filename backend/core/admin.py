from django.contrib import admin

from .models import (
    Department, AccountType, Account, FiscalYear,
    BudgetProposal, BudgetProposalItem, BudgetAllocation,
    BudgetTransfer, JournalEntry, JournalEntryLine, Expense,
    ProposalHistory, ProposalComment, TransactionAudit,
    Project, DashboardMetric, RiskMetric, ExpenseCategory
)

# Register all models with the Django admin site
admin.site.register(Department)
admin.site.register(AccountType)
admin.site.register(Account)
admin.site.register(FiscalYear)
admin.site.register(BudgetProposal)
admin.site.register(BudgetProposalItem)
admin.site.register(BudgetAllocation)
admin.site.register(BudgetTransfer)
admin.site.register(JournalEntry)
admin.site.register(JournalEntryLine)
admin.site.register(Expense)
admin.site.register(ProposalHistory)
admin.site.register(ProposalComment)
admin.site.register(TransactionAudit)
admin.site.register(Project)
admin.site.register(DashboardMetric)
admin.site.register(RiskMetric)
admin.site.register(ExpenseCategory)