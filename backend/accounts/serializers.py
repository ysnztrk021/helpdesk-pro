
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from accounts.models import UserProfile

User = get_user_model()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=12)
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        write_only=True,
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]
        read_only_fields = ["id"]

    @transaction.atomic
    def create(self, validated_data):
        role = validated_data.pop("role")
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": role},
        )

        return user

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["role"] = instance.profile.role
        return data

class UserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        required=False,
    )

    class Meta:
        model = User
        fields = ["role", "is_active"]

    @transaction.atomic
    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        instance = super().update(instance, validated_data)

        if role is not None:
            UserProfile.objects.update_or_create(
                user=instance,
                defaults={"role": role},
            )

        return instance
