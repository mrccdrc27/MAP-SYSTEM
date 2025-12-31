# workflow_api/attachments/management/commands/cleanup_pdf_cache.py
"""
Management command to cleanup old/unused PDF cache entries.

Usage:
    python manage.py cleanup_pdf_cache
    python manage.py cleanup_pdf_cache --max-age-days=7
    python manage.py cleanup_pdf_cache --max-size-gb=5
    python manage.py cleanup_pdf_cache --dry-run
"""

from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum


class Command(BaseCommand):
    help = 'Cleanup old and unused PDF cache entries using LRU strategy'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age-days',
            type=int,
            default=30,
            help='Delete entries not accessed in this many days (default: 30)'
        )
        parser.add_argument(
            '--max-size-gb',
            type=int,
            default=10,
            help='Target maximum cache size in GB (default: 10)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--clear-failed',
            action='store_true',
            help='Also clear failed conversion entries'
        )
    
    def handle(self, *args, **options):
        from attachments.models import AttachmentPDFCache
        
        max_age_days = options['max_age_days']
        max_size_gb = options['max_size_gb']
        dry_run = options['dry_run']
        clear_failed = options['clear_failed']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - no changes will be made'))
        
        stats = {
            'deleted_by_age': 0,
            'deleted_by_size': 0,
            'deleted_failed': 0,
            'bytes_freed': 0,
        }
        
        # 1. Show current cache stats
        total_entries = AttachmentPDFCache.objects.count()
        completed_entries = AttachmentPDFCache.objects.filter(
            status=AttachmentPDFCache.ConversionStatus.COMPLETED
        ).count()
        total_size = AttachmentPDFCache.objects.filter(
            status=AttachmentPDFCache.ConversionStatus.COMPLETED
        ).aggregate(total=Sum('pdf_file_size'))['total'] or 0
        
        self.stdout.write(f'\nCurrent cache stats:')
        self.stdout.write(f'  Total entries: {total_entries}')
        self.stdout.write(f'  Completed: {completed_entries}')
        self.stdout.write(f'  Total size: {self._format_size(total_size)}')
        
        # 2. Delete entries older than max_age_days
        cutoff_date = timezone.now() - timedelta(days=max_age_days)
        old_entries = AttachmentPDFCache.objects.filter(
            last_accessed_at__lt=cutoff_date,
            status=AttachmentPDFCache.ConversionStatus.COMPLETED
        )
        
        self.stdout.write(f'\nEntries not accessed in {max_age_days} days: {old_entries.count()}')
        
        for entry in old_entries:
            stats['bytes_freed'] += entry.pdf_file_size or 0
            stats['deleted_by_age'] += 1
            
            if not dry_run:
                if entry.pdf_file:
                    entry.pdf_file.delete(save=False)
                entry.delete()
            else:
                self.stdout.write(f'  Would delete: {entry.original_file_name} (attachment {entry.helpdesk_attachment_id})')
        
        # 3. Clear failed entries if requested
        if clear_failed:
            failed_entries = AttachmentPDFCache.objects.filter(
                status=AttachmentPDFCache.ConversionStatus.FAILED
            )
            self.stdout.write(f'\nFailed entries to clear: {failed_entries.count()}')
            
            for entry in failed_entries:
                stats['deleted_failed'] += 1
                if not dry_run:
                    entry.delete()
                else:
                    self.stdout.write(f'  Would delete failed: {entry.original_file_name}')
        
        # 4. If still over size limit, delete LRU entries
        max_size_bytes = max_size_gb * 1024 * 1024 * 1024
        current_size = AttachmentPDFCache.objects.filter(
            status=AttachmentPDFCache.ConversionStatus.COMPLETED
        ).aggregate(total=Sum('pdf_file_size'))['total'] or 0
        current_size -= stats['bytes_freed']  # Account for already deleted
        
        if current_size > max_size_bytes:
            excess = current_size - max_size_bytes
            self.stdout.write(f'\nCache over size limit by {self._format_size(excess)}')
            
            lru_entries = AttachmentPDFCache.objects.filter(
                status=AttachmentPDFCache.ConversionStatus.COMPLETED
            ).order_by('last_accessed_at')
            
            for entry in lru_entries:
                if current_size <= max_size_bytes:
                    break
                
                freed = entry.pdf_file_size or 0
                current_size -= freed
                stats['bytes_freed'] += freed
                stats['deleted_by_size'] += 1
                
                if not dry_run:
                    if entry.pdf_file:
                        entry.pdf_file.delete(save=False)
                    entry.delete()
                else:
                    self.stdout.write(f'  Would delete LRU: {entry.original_file_name}')
        
        # 5. Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('Cleanup Summary:'))
        self.stdout.write(f'  Deleted by age: {stats["deleted_by_age"]}')
        self.stdout.write(f'  Deleted by size (LRU): {stats["deleted_by_size"]}')
        if clear_failed:
            self.stdout.write(f'  Deleted failed: {stats["deleted_failed"]}')
        self.stdout.write(f'  Total bytes freed: {self._format_size(stats["bytes_freed"])}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN - no changes were made'))
    
    def _format_size(self, size_bytes):
        """Format file size for display."""
        if not size_bytes:
            return '0 B'
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
