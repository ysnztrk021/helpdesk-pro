
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.models import UserProfile
from tickets.models import Ticket, Category
from tickets.serializers import TicketSerializer, CategorySerializer


def get_user_role(user):
    if user.is_superuser:
        return UserProfile.Role.ADMIN

    try:
        return user.profile.role
    except UserProfile.DoesNotExist:
        return None


class TicketListCreateView(generics.ListCreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role == UserProfile.Role.ADMIN:
            return Ticket.objects.select_related(
                "created_by", "assigned_to"
            ).all()

        if role == UserProfile.Role.TECHNICIAN:
            return Ticket.objects.select_related(
                "created_by", "assigned_to"
            ).filter(assigned_to=user)

        return Ticket.objects.select_related(
            "created_by", "assigned_to"
        ).filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_context(self):
        return super().get_serializer_context()


class TicketDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "put", "patch", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role == UserProfile.Role.ADMIN:
            return Ticket.objects.all()

        if role == UserProfile.Role.TECHNICIAN:
            return Ticket.objects.filter(assigned_to=user)

        return Ticket.objects.filter(created_by=user)
    
    def update(self, request, *args, **kwargs):
        role = get_user_role(request.user)

        if role == UserProfile.Role.EMPLOYEE:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Les employés ne peuvent pas modifier les tickets après leur création."
            )

        if role == UserProfile.Role.TECHNICIAN:
            from rest_framework.exceptions import PermissionDenied

            if request.method != "PATCH":
                raise PermissionDenied(
                    "Les techniciens doivent utiliser PATCH pour modifier un ticket."
                )

            allowed_fields = {"status"}
            submitted_fields = set(request.data.keys())
            forbidden_fields = submitted_fields - allowed_fields

            if forbidden_fields:
                raise PermissionDenied(
                    "Les techniciens peuvent uniquement modifier le statut du ticket."
                )

        return super().update(request, *args, **kwargs)


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(is_active=True).order_by("name")
    