from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from accounts.serializers import UserCreateSerializer, UserUpdateSerializer
from accounts.models import UserProfile

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                "role": (
                    UserProfile.Role.ADMIN
                    if user.is_superuser
                    else UserProfile.Role.EMPLOYEE
                )
            },
        )

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "role": profile.role,
        })

class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        try:
            return request.user.profile.role == UserProfile.Role.ADMIN
        except UserProfile.DoesNotExist:
            return False

class UserCreateView(generics.CreateAPIView):
    serializer_class = UserCreateSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

class TechnicianListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        User = get_user_model()
        return User.objects.filter(
            profile__role=UserProfile.Role.TECHNICIAN
        ).order_by("username")

    def list(self, request, *args, **kwargs):
        users = self.get_queryset()
        data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }
            for user in users
        ]
        return Response(data)

class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        User = get_user_model()
        return User.objects.select_related("profile").order_by("username")

    def list(self, request, *args, **kwargs):
        users = self.get_queryset()
        data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": (
                    user.profile.role
                    if hasattr(user, "profile")
                    else UserProfile.Role.EMPLOYEE
                ),
                "is_active": user.is_active,
            }
            for user in users
        ]
        return Response(data)

class UserDetailView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = UserUpdateSerializer
    queryset = get_user_model().objects.all()

    def update(self, request, *args, **kwargs):
        user = self.get_object()

        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {"detail": "Seul un superutilisateur peut modifier ce compte."},
                status=403,
            )

        if user.pk == request.user.pk and request.data.get("is_active") is False:
            return Response(
                {"detail": "Tu ne peux pas désactiver ton propre compte."},
                status=400,
            )

        return super().update(request, *args, **kwargs)
