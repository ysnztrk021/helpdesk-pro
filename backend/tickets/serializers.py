
from rest_framework import serializers

from accounts.models import UserProfile
from tickets.models import Category, Ticket


class TicketSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source="created_by.username")
    category_name = serializers.ReadOnlyField(source="category.name")
    assigned_to = serializers.SlugRelatedField(
        slug_field="username",
        queryset=Ticket._meta.get_field("assigned_to").remote_field.model.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Ticket
        fields = [
            "id",
            "title",
            "description",
            "category",
            "category_name",
            "status",
            "priority",
            "created_by",
            "assigned_to",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "category_name",
            "created_at",
            "updated_at",
        ]

    def validate_assigned_to(self, user):
        if user is None:
            return user

        if user.is_superuser:
            return user

        try:
            role = user.profile.role
        except UserProfile.DoesNotExist:
            raise serializers.ValidationError(
                "Cet utilisateur n'a pas de profil valide."
            )

        if role not in [UserProfile.Role.TECHNICIAN, UserProfile.Role.ADMIN]:
            raise serializers.ValidationError(
                "Un ticket ne peut être assigné qu'à un technicien ou un administrateur."
            )

        return user

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "is_active"]
        read_only_fields = ["id"]