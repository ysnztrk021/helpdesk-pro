
from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from accounts.views import (
    CurrentUserView,
    UserCreateView,
    TechnicianListView,
    UserListView,
    UserDetailView
)
from tickets.views import TicketListCreateView, TicketDetailView, CategoryListView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("api/accounts/", UserCreateView.as_view(), name="account-create"),
    path("api/tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("api/tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),
    path("api/categories/", CategoryListView.as_view(), name="category-list"),
    path("api/accounts/technicians/", TechnicianListView.as_view(),name="technician-list",),
    path("api/accounts/users/", UserListView.as_view(), name="user-list"),
    path("api/accounts/users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
]
