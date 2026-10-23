
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.models import UserProfile
from tickets.models import Category, Ticket

from tickets.views import get_user_role

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def employee(db):
    user = User.objects.create_user(
        username="employee_test",
        password="TestPassword123!",
    )
    UserProfile.objects.update_or_create(
        user=user,
        defaults={"role": UserProfile.Role.EMPLOYEE},
    )
    return user


@pytest.fixture
def another_employee(db):
    user = User.objects.create_user(
        username="another_employee",
        password="TestPassword123!",
    )
    UserProfile.objects.update_or_create(
        user=user,
        defaults={"role": UserProfile.Role.EMPLOYEE},
    )
    return user


@pytest.fixture
def ticket(employee):
    return Ticket.objects.create(
        title="Problème de Wi-Fi",
        description="Connexion impossible",
        created_by=employee,
    )


@pytest.mark.django_db
def test_unauthenticated_user_cannot_list_tickets(api_client):
    response = api_client.get("/api/tickets/")

    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_employee_only_sees_own_tickets(
    api_client, employee, another_employee, ticket
):
    Ticket.objects.create(
        title="Ticket privé",
        description="Autre employé",
        created_by=another_employee,
    )

    api_client.force_authenticate(user=employee)
    response = api_client.get("/api/tickets/")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["title"] == "Problème de Wi-Fi"


@pytest.mark.django_db
def test_employee_cannot_modify_existing_ticket(api_client, employee, ticket):
    api_client.force_authenticate(user=employee)

    response = api_client.patch(
        f"/api/tickets/{ticket.id}/",
        {"title": "Titre modifié"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_authenticated_user_can_list_active_categories(api_client, employee):
    Category.objects.create(name="Réseau", is_active=True)
    Category.objects.create(name="Ancienne catégorie", is_active=False)

    api_client.force_authenticate(user=employee)
    response = api_client.get("/api/categories/")

    assert response.status_code == 200
    assert [item["name"] for item in response.data] == ["Réseau"]


@pytest.mark.django_db
def test_unauthenticated_user_cannot_list_categories(api_client):
    response = api_client.get("/api/categories/")

    assert response.status_code in (401, 403)



@pytest.fixture
def technician(db):
    user = User.objects.create_user(
        username="technician_test",
        password="TestPassword123!",
    )
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = UserProfile.Role.TECHNICIAN
    profile.save(update_fields=["role"])
    user.refresh_from_db()
    return user



@pytest.mark.django_db
def test_ticket_can_be_assigned_to_technician(
    api_client, employee, technician
):
    api_client.force_authenticate(user=employee)

    response = api_client.post(
        "/api/tickets/",
        {
            "title": "Ordinateur en panne",
            "description": "Le poste ne démarre plus.",
            "priority": "high",
            "assigned_to": technician.username,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["assigned_to"] == technician.username


@pytest.mark.django_db
def test_ticket_cannot_be_assigned_to_another_employee(
    api_client, employee, another_employee
):
    api_client.force_authenticate(user=employee)

    response = api_client.post(
        "/api/tickets/",
        {
            "title": "Ordinateur en panne",
            "description": "Le poste ne démarre plus.",
            "priority": "high",
            "assigned_to": another_employee.username,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "assigned_to" in response.data


@pytest.mark.django_db
def test_technician_cannot_change_ticket_priority(
    api_client, employee, technician
):
    ticket = Ticket.objects.create(
        title="Problème réseau",
        description="Connexion instable",
        created_by=employee,
        assigned_to=technician,
        priority=Ticket.Priority.NORMAL,
    )

    api_client.force_authenticate(user=technician)

    print("Fixture role:", technician.profile.role)
    print("Resolved role:", get_user_role(technician))

    response = api_client.patch(
        f"/api/tickets/{ticket.id}/",
        {"priority": "urgent"},
        format="json",
    )

    assert response.status_code == 403

    ticket.refresh_from_db()
    assert ticket.priority == Ticket.Priority.NORMAL


@pytest.mark.django_db
def test_technician_cannot_reassign_ticket(
    api_client, employee, another_employee, technician
):
    ticket = Ticket.objects.create(
        title="Problème réseau",
        description="Connexion instable",
        created_by=employee,
        assigned_to=technician,
    )

    api_client.force_authenticate(user=technician)

    response = api_client.patch(
        f"/api/tickets/{ticket.id}/",
        {"assigned_to": another_employee.username},
        format="json",
    )

    assert response.status_code == 403

    ticket.refresh_from_db()
    assert ticket.assigned_to == technician



@pytest.mark.django_db
def test_technician_can_change_assigned_ticket_status(
    api_client, employee, technician
):
    print("Fixture role:", technician.profile.role)
    print("Expected role:", UserProfile.Role.TECHNICIAN)

    assert technician.profile.role == UserProfile.Role.TECHNICIAN

    ticket = Ticket.objects.create(
        title="Problème réseau",
        description="Connexion instable",
        created_by=employee,
        assigned_to=technician,
        status=Ticket.Status.OPEN,
    )

    api_client.force_authenticate(user=technician)

    response = api_client.patch(
        f"/api/tickets/{ticket.id}/",
        {"status": Ticket.Status.IN_PROGRESS},
        format="json",
    )

    print("HTTP:", response.status_code)
    print("Response:", response.data)

    assert response.status_code == 200

    ticket.refresh_from_db()
    assert ticket.status == Ticket.Status.IN_PROGRESS


@pytest.mark.django_db
def test_technician_cannot_access_unassigned_ticket(
    api_client, employee, another_employee, technician
):
    ticket = Ticket.objects.create(
        title="Ticket non assigné",
        description="Ce ticket appartient à un autre technicien.",
        created_by=employee,
        assigned_to=another_employee,
    )

    api_client.force_authenticate(user=technician)

    response = api_client.get(f"/api/tickets/{ticket.id}/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_authenticated_user_can_get_own_profile(api_client, employee):
    api_client.force_authenticate(user=employee)

    response = api_client.get("/api/auth/me/")

    assert response.status_code == 200
    assert response.data["username"] == employee.username
    assert response.data["role"] == UserProfile.Role.EMPLOYEE


@pytest.mark.django_db
def test_employee_cannot_create_accounts(api_client, employee):
    api_client.force_authenticate(user=employee)

    response = api_client.post(
        "/api/accounts/",
        {
            "username": "new_employee",
            "email": "new_employee@example.com",
            "password": "StrongTestPassword123!",
            "role": UserProfile.Role.EMPLOYEE,
        },
        format="json",
    )

    assert response.status_code == 403
    assert not User.objects.filter(username="new_employee").exists()


@pytest.mark.django_db
def test_employee_cannot_access_another_employees_ticket(
    api_client, employee, another_employee
):
    other_ticket = Ticket.objects.create(
        title="Ticket confidentiel",
        description="Ce ticket appartient à un autre employé.",
        created_by=another_employee,
    )

    api_client.force_authenticate(user=employee)

    response = api_client.get(f"/api/tickets/{other_ticket.id}/")

    assert response.status_code == 404


@pytest.fixture
def admin_user(db):
    user = User.objects.create_superuser(
        username="admin_test",
        email="admin_test@example.com",
        password="TestPassword123!",
    )
    return user


@pytest.mark.django_db
def test_admin_can_see_all_tickets(
    api_client, employee, another_employee, admin_user
):
    Ticket.objects.create(
        title="Ticket employé 1",
        description="Premier ticket",
        created_by=employee,
    )
    Ticket.objects.create(
        title="Ticket employé 2",
        description="Deuxième ticket",
        created_by=another_employee,
    )

    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/tickets/")

    assert response.status_code == 200
    assert len(response.data) == 2
    assert {item["title"] for item in response.data} == {
        "Ticket employé 1",
        "Ticket employé 2",
    }


@pytest.mark.django_db
def test_admin_can_modify_ticket(api_client, employee, admin_user):
    ticket = Ticket.objects.create(
        title="Ordinateur en panne",
        description="Le poste ne démarre plus.",
        created_by=employee,
    )

    api_client.force_authenticate(user=admin_user)
    response = api_client.patch(
        f"/api/tickets/{ticket.id}/",
        {"priority": Ticket.Priority.URGENT},
        format="json",
    )

    assert response.status_code == 200

    ticket.refresh_from_db()
    assert ticket.priority == Ticket.Priority.URGENT

@pytest.mark.django_db
def test_admin_can_list_technicians(api_client, admin_user, technician):
    api_client.force_authenticate(user=admin_user)

    response = api_client.get("/api/accounts/technicians/")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["username"] == technician.username


@pytest.mark.django_db
def test_employee_cannot_list_technicians(api_client, employee):
    api_client.force_authenticate(user=employee)

    response = api_client.get("/api/accounts/technicians/")

    assert response.status_code == 403
