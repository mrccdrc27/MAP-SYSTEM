from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.decorators import permission_classes

from ..authentication import CookieJWTAuthentication, ExternalUser
from ..models import KnowledgeArticle, KnowledgeArticleVersion, ARTICLE_CATEGORY_CHOICES
from ..serializers import KnowledgeArticleSerializer
from .permissions import IsAdminOrSystemAdmin, IsAdminOrCoordinator


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeArticleSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSystemAdmin]

    def get_permissions(self):
        """Allow safe (read-only) methods to be accessible without Admin permission.
        Unsafe methods (create/update/delete) require IsAuthenticated.
        Delete requires IsAdminOrCoordinator.
        Create/update still require IsAdminOrSystemAdmin.
        """
        if self.request.method in ['GET', 'HEAD', 'OPTIONS']:
            return [AllowAny()]
        if self.request.method == 'DELETE':
            return [IsAuthenticated(), IsAdminOrCoordinator()]
        return [perm() for perm in self.permission_classes]

    def get_queryset(self):
        """Return all articles for listing; filtering happens in the view layer"""
        return KnowledgeArticle.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        """Set the created_by field to the current user.

        If the request user is an ExternalUser (token-authenticated user from
        the separate auth service) we cannot assign it directly to the
        ForeignKey (which expects an Employee instance). The `created_by`
        field is nullable so we store `None` in that case.
        """
        user = self.request.user
        if isinstance(user, ExternalUser):
            article = serializer.save(created_by=None)
        else:
            article = serializer.save(created_by=user)
        # Create initial version entry with full content snapshot
        try:
            KnowledgeArticleVersion.objects.create(
                article=article,
                version_number='1',
                editor=None if isinstance(user, ExternalUser) else user,
                changes='Created article',
                metadata={'subject': article.subject},
                # Save content snapshot
                subject_snapshot=article.subject,
                description_snapshot=article.description,
                category_snapshot=article.category,
                visibility_snapshot=article.visibility,
                tags_snapshot=article.tags or [],
            )
        except Exception:
            pass

    
    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """Archive an article"""
        article = self.get_object()
        article.is_archived = True
        article.save()
        return Response({'detail': 'Article archived successfully.'}, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        """Override update to record a version entry with full content snapshot for each edit."""
        request = getattr(self, 'request', None)
        user = request.user if request is not None else None
        # Capture previous state for metadata if needed
        try:
            article_before = self.get_object()
        except Exception:
            article_before = None

        article = serializer.save()
        try:
            # Determine next version number (simple increment based on count)
            count = article.versions.count() if hasattr(article, 'versions') else 0
            version_number = str(count + 1)
            KnowledgeArticleVersion.objects.create(
                article=article,
                version_number=version_number,
                editor=None if isinstance(user, ExternalUser) else user,
                changes=request.data.get('summary') or 'Updated article',
                metadata={'before': None, 'after': None},
                # Save content snapshot
                subject_snapshot=article.subject,
                description_snapshot=article.description,
                category_snapshot=article.category,
                visibility_snapshot=article.visibility,
                tags_snapshot=article.tags or [],
            )
        except Exception:
            pass
    
    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """Restore an archived article"""
        article = self.get_object()
        article.is_archived = False
        article.save()
        return Response({'detail': 'Article restored successfully.'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='restore-version')
    def restore_version(self, request, pk=None):
        """Restore an article to a specific version.
        
        Expected payload: { "version_id": <int> }
        This will update the article content to match the specified version's snapshot,
        and create a new version entry documenting the restore action.
        """
        article = self.get_object()
        version_id = request.data.get('version_id')
        
        if not version_id:
            return Response({'detail': 'version_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            version = KnowledgeArticleVersion.objects.get(id=version_id, article=article)
        except KnowledgeArticleVersion.DoesNotExist:
            return Response({'detail': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if the version has content to restore
        if not version.description_snapshot:
            return Response({'detail': 'This version does not have content to restore.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Restore article content from the version snapshot
        article.subject = version.subject_snapshot or article.subject
        article.description = version.description_snapshot
        article.category = version.category_snapshot or article.category
        article.visibility = version.visibility_snapshot or article.visibility
        article.tags = version.tags_snapshot or article.tags
        article.save()
        
        # Create a new version entry documenting the restore
        user = request.user
        count = article.versions.count() if hasattr(article, 'versions') else 0
        new_version_number = str(count + 1)
        
        try:
            KnowledgeArticleVersion.objects.create(
                article=article,
                version_number=new_version_number,
                editor=None if isinstance(user, ExternalUser) else user,
                changes=f'Restored to version {version.version_number}',
                metadata={'restored_from_version_id': version.id},
                subject_snapshot=article.subject,
                description_snapshot=article.description,
                category_snapshot=article.category,
                visibility_snapshot=article.visibility,
                tags_snapshot=article.tags or [],
            )
        except Exception:
            pass
        
        return Response({
            'detail': f'Article restored to version {version.version_number} successfully.',
            'article': KnowledgeArticleSerializer(article, context={'request': request}).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='choices')
    def choices(self, request):
        """Return available category choices for knowledge articles"""
        return Response({
            'categories': [{'value': choice[0], 'label': choice[1]} for choice in ARTICLE_CATEGORY_CHOICES]
        }, status=status.HTTP_200_OK)
