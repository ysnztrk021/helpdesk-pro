
import { useEffect, useState, type FormEvent } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

type Profile = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  role: "employee" | "technician" | "admin";
};

type Technician = {
  id: number;
  username: string;
  email: string;
};

type ManagedUser = {
  id: number;
  username: string;
  email: string;
  role: Profile["role"];
  is_active: boolean;
};

type Category = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
};

type Ticket = {
  id: number;
  title: string;
  description: string;
  category: number | null;
  category_name: string | null;
  status: "open" | "in_progress" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<Ticket["status"], string> = {
  open: "Ouvert",
  in_progress: "En cours",
  pending: "En attente",
  resolved: "Résolu",
  closed: "Fermé",
};

const priorityLabels: Record<Ticket["priority"], string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const roleLabels: Record<Profile["role"], string> = {
  employee: "Employé",
  technician: "Technicien",
  admin: "Administrateur",
};

const statusOptions: Ticket["status"][] = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
];

const priorityOptions: Ticket["priority"][] = [
  "low",
  "normal",
  "high",
  "urgent",
];

function getErrorMessage(data: unknown): string {
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    return Object.entries(record)
      .map(([field, messages]) => {
        const detail = Array.isArray(messages)
          ? messages.join(", ")
          : String(messages);

        return `${field} : ${detail}`;
      })
      .join(" · ");
  }

  return "Une erreur est survenue.";
}

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [activeTab, setActiveTab] = useState<"tickets" | "users">("tickets");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"employee" | "technician">("employee");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPriority, setTicketPriority] =
    useState<Ticket["priority"]>("normal");
  const [ticketTechnician, setTicketTechnician] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketFormError, setTicketFormError] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState("");

  const [updatingTicketId, setUpdatingTicketId] = useState<number | null>(
    null,
  );
  const [ticketActionError, setTicketActionError] = useState("");
  const [ticketActionSuccess, setTicketActionSuccess] = useState("");

  async function loadDashboard(token: string) {
    const profileResponse = await fetch(`${API_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      throw new Error("Session invalide. Connecte-toi à nouveau.");
    }

    const currentProfile: Profile = await profileResponse.json();
    setProfile(currentProfile);

    setTicketsLoading(true);
    setTicketsError("");

    try {
      const requests = [
        fetch(`${API_URL}/api/tickets/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/categories/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ];

      const isAdmin = currentProfile.role === "admin" || currentProfile.is_staff;

      if (isAdmin) {
        requests.push(
          fetch(`${API_URL}/api/accounts/technicians/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
      }

      const [ticketsResponse, categoriesResponse, techniciansResponse] =
        await Promise.all(requests);

      if (ticketsResponse.status === 401) {
        throw new Error("Session expirée. Reconnecte-toi.");
      }

      if (!ticketsResponse.ok) {
        throw new Error("Impossible de charger les tickets.");
      }

      const ticketsData = await ticketsResponse.json();

      setTickets(
        Array.isArray(ticketsData)
          ? ticketsData
          : ticketsData.results ?? [],
      );

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();

        setCategories(
          Array.isArray(categoriesData)
            ? categoriesData
            : categoriesData.results ?? [],
        );
      } else {
        setCategories([]);
      }

      if (isAdmin && techniciansResponse) {
        if (!techniciansResponse.ok) {
          throw new Error("Impossible de charger la liste des techniciens.");
        }

        const techniciansData = await techniciansResponse.json();
        setTechnicians(
          Array.isArray(techniciansData)
            ? techniciansData
            : techniciansData.results ?? [],
        );
      } else {
        setTechnicians([]);
      }
    } catch (err) {
      setTicketsError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant le chargement.",
      );
    } finally {
      setTicketsLoading(false);
    }
  }

  async function refreshTickets() {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      handleLogout();
      return;
    }

    setTicketsLoading(true);
    setTicketsError("");

    try {
      const response = await fetch(`${API_URL}/api/tickets/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        throw new Error("Session expirée. Reconnecte-toi.");
      }

      if (!response.ok) {
        throw new Error("Impossible d'actualiser les tickets.");
      }

      const data = await response.json();

      setTickets(Array.isArray(data) ? data : data.results ?? []);
      setTicketActionError("");
    } catch (err) {
      setTicketsError(
        err instanceof Error ? err.message : "Erreur de chargement.",
      );
    } finally {
      setTicketsLoading(false);
    }
  }

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");

    if (!token) return;

    loadDashboard(token).catch(() => {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      setProfile(null);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError("Identifiants incorrects. Vérifie ton nom d'utilisateur et ton mot de passe.");
        return;
      }

      const data: { access: string; refresh: string } =
        await response.json();

      sessionStorage.setItem("access_token", data.access);
      sessionStorage.setItem("refresh_token", data.refresh);

      await loadDashboard(data.access);
    } catch (err) {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      setProfile(null);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de joindre le serveur Django.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setTicketFormError("Ta session a expiré. Reconnecte-toi.");
      return;
    }

    setTicketSubmitting(true);
    setTicketFormError("");
    setTicketSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/tickets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: ticketTitle.trim(),
          description: ticketDescription.trim(),
          category: ticketCategory ? Number(ticketCategory) : null,
          priority: ticketPriority,
          ...(profile && (profile.role === "admin" || profile.is_staff)
            ? { assigned_to: ticketTechnician || null }
            : {}),
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      const newTicket = data as Ticket;

      newTicket.category_name =
        categories.find((category) => category.id === newTicket.category)
          ?.name ?? null;

      setTickets((previous) => [
        newTicket,
        ...previous.filter((ticket) => ticket.id !== newTicket.id),
      ]);

      setTicketTitle("");
      setTicketDescription("");
      setTicketCategory("");
      setTicketPriority("normal");
      setTicketTechnician("");
      setShowTicketForm(false);
      setTicketSuccess(`Le ticket #${newTicket.id} a été créé avec succès.`);
    } catch (err) {
      setTicketFormError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant la création.",
      );
    } finally {
      setTicketSubmitting(false);
    }
  }

  async function updateTicket(
    ticket: Ticket,
    changes: Partial<Pick<Ticket, "status" | "priority" | "assigned_to">>,
  ) {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      handleLogout();
      return;
    }

    setUpdatingTicketId(ticket.id);
    setTicketActionError("");
    setTicketActionSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticket.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changes),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      const updatedTicket = data as Ticket;

      setTickets((previous) =>
        previous.map((item) =>
          item.id === updatedTicket.id ? updatedTicket : item,
        ),
      );

      setTicketActionSuccess(
        `Le ticket #${updatedTicket.id} a été mis à jour.`,
      );
    } catch (err) {
      setTicketActionError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier ce ticket.",
      );

      await refreshTickets();
    } finally {
      setUpdatingTicketId(null);
    }
  }

  async function loadUsers() {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      handleLogout();
      return;
    }

    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await fetch(`${API_URL}/api/accounts/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data));
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Impossible de charger les utilisateurs.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function updateUser(
    user: ManagedUser,
    changes: Partial<Pick<ManagedUser, "role" | "is_active">>,
  ) {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      handleLogout();
      return;
    }

    setUsersError("");
    setUserSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/accounts/users/${user.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(changes),
        },
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setUserSuccess(`Le compte « ${user.username} » a été mis à jour.`);
      await loadUsers();
    } catch (err) {
      setUsersError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier cet utilisateur.",
      );
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setUsersError("Ta session a expiré. Reconnecte-toi.");
      return;
    }

    setUserSubmitting(true);
    setUsersError("");
    setUserSuccess("");
    try {
      const response = await fetch(`${API_URL}/api/accounts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data));

      const createdUser = { ...(data as ManagedUser), is_active: true };
      setUsers((previous) => [createdUser, ...previous.filter((user) => user.id !== createdUser.id)]);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("employee");
      setUserSuccess(`Le compte « ${createdUser.username} » a été créé.`);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Impossible de créer cet utilisateur.");
    } finally {
      setUserSubmitting(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");

    setProfile(null);
    setTickets([]);
    setCategories([]);
    setTechnicians([]);
    setUsers([]);
    setActiveTab("tickets");
    setShowTicketForm(false);
    setTicketSuccess("");
    setTicketFormError("");
    setTicketActionError("");
    setTicketActionSuccess("");
    setUsername("");
    setPassword("");
    setError("");
  }

  if (profile) {
    const openCount = tickets.filter(
      (ticket) => ticket.status === "open",
    ).length;

    const inProgressCount = tickets.filter(
      (ticket) => ticket.status === "in_progress",
    ).length;

    const resolvedCount = tickets.filter(
      (ticket) =>
        ticket.status === "resolved" || ticket.status === "closed",
    ).length;

    const isTechnician = profile.role === "technician";
    const isAdmin =
      profile.role === "admin" || profile.is_staff;
    const canCreateTicket = profile.role === "employee" || isAdmin;

    const pageTitle = isTechnician
      ? "Espace technicien"
      : isAdmin
        ? "Administration"
        : "Mes demandes";

    const pageDescription = isTechnician
      ? "Traite les demandes qui te sont assignées."
      : isAdmin
        ? "Supervise les demandes de support informatique."
        : "Suis l'avancement de tes demandes de support.";

    return (
      <main className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-brand">
            <div className="brand-mark">H</div>
            <div>
              <strong>Helpdesk Pro</strong>
              <span>Centre de support informatique</span>
            </div>
          </div>

          <div className="user-menu">
            <div className="user-info">
              <strong>{profile.username}</strong>
              <span>{roleLabels[profile.role] ?? profile.role}</span>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Déconnexion
            </button>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="welcome-section">
            <p className="eyebrow">{pageTitle.toUpperCase()}</p>
            <h1>Bonjour, {profile.username} 👋</h1>
            <p>{pageDescription}</p>
          </div>

          {isAdmin && (
            <nav className="ticket-actions" aria-label="Navigation administration">
              <button
                type="button"
                className={activeTab === "tickets" ? "new-ticket-button" : "logout-button"}
                onClick={() => setActiveTab("tickets")}
              >
                Tickets
              </button>
              <button
                type="button"
                className={activeTab === "users" ? "new-ticket-button" : "logout-button"}
                onClick={() => {
                  setActiveTab("users");
                  setUserSuccess("");
                  void loadUsers();
                }}
              >
                Gestion des utilisateurs
              </button>
            </nav>
          )}

          {(!isAdmin || activeTab === "tickets") ? (
            <>
          <div className="ticket-actions">
            {canCreateTicket && (
              <button
                type="button"
                className="new-ticket-button"
                onClick={() => {
                  setTicketFormError("");
                  setTicketSuccess("");
                  setShowTicketForm((previous) => !previous);
                }}
              >
                {showTicketForm ? "Annuler" : "+ Nouveau ticket"}
              </button>
            )}

            <button
              type="button"
              className="logout-button"
              onClick={refreshTickets}
              disabled={ticketsLoading}
            >
              {ticketsLoading ? "Actualisation…" : "Actualiser"}
            </button>
          </div>

          {ticketSuccess && (
            <p className="success-message" role="status">
              {ticketSuccess}
            </p>
          )}

          {ticketActionSuccess && (
            <p className="success-message" role="status">
              {ticketActionSuccess}
            </p>
          )}

          {ticketActionError && (
            <p className="error-message" role="alert">
              {ticketActionError}
            </p>
          )}

          {showTicketForm && canCreateTicket && (
            <form className="ticket-form" onSubmit={handleCreateTicket}>
              <div className="ticket-form-heading">
                <h2>Créer une demande</h2>
                <p>
                  Décris ton problème pour que le support puisse le traiter.
                </p>
              </div>

              <label htmlFor="ticket-title">Titre</label>
              <input
                id="ticket-title"
                value={ticketTitle}
                onChange={(event) => setTicketTitle(event.target.value)}
                maxLength={200}
                placeholder="Ex. : Impossible de se connecter au Wi-Fi"
                required
              />

              <label htmlFor="ticket-description">Description</label>
              <textarea
                id="ticket-description"
                value={ticketDescription}
                onChange={(event) =>
                  setTicketDescription(event.target.value)
                }
                rows={4}
                placeholder="Décris le problème et les circonstances..."
                required
              />

              <label htmlFor="ticket-category">Catégorie</label>
              <select
                id="ticket-category"
                value={ticketCategory}
                onChange={(event) => setTicketCategory(event.target.value)}
              >
                <option value="">Sans catégorie</option>
                {categories
                  .filter((category) => category.is_active)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>

              <label htmlFor="ticket-priority">Priorité</label>
              <select
                id="ticket-priority"
                value={ticketPriority}
                onChange={(event) =>
                  setTicketPriority(
                    event.target.value as Ticket["priority"],
                  )
                }
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </select>

              {isAdmin && (
                <>
                  <label htmlFor="ticket-technician">Technicien assigné</label>
                  <select
                    id="ticket-technician"
                    value={ticketTechnician}
                    onChange={(event) => setTicketTechnician(event.target.value)}
                  >
                    <option value="">Non assigné</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.username}>
                        {technician.username}
                        {technician.email ? ` (${technician.email})` : ""}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {ticketFormError && (
                <p className="error-message" role="alert">
                  {ticketFormError}
                </p>
              )}

              <button type="submit" disabled={ticketSubmitting}>
                {ticketSubmitting ? "Création..." : "Créer le ticket"}
              </button>
            </form>
          )}

          <div className="stats-grid">
            <article className="stat-card">
              <span>Total des tickets</span>
              <strong>{tickets.length}</strong>
              <small>
                {isTechnician ? "Tickets qui te sont assignés" : "Tickets accessibles"}
              </small>
            </article>

            <article className="stat-card">
              <span>Ouverts</span>
              <strong>{openCount}</strong>
              <small>En attente de traitement</small>
            </article>

            <article className="stat-card">
              <span>En cours</span>
              <strong>{inProgressCount}</strong>
              <small>En cours de résolution</small>
            </article>

            <article className="stat-card">
              <span>Résolus / clôturés</span>
              <strong>{resolvedCount}</strong>
              <small>Demandes terminées</small>
            </article>
          </div>

          <section className="tickets-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {isTechnician
                    ? "Tickets assignés"
                    : isAdmin
                      ? "Tous les tickets"
                      : "Mes tickets récents"}
                </h2>
                <p>
                  {isTechnician
                    ? "Mets à jour le statut après chaque intervention."
                    : "Les demandes accessibles selon ton rôle."}
                </p>
              </div>

              <span className="ticket-count">
                {tickets.length} ticket(s)
              </span>
            </div>

            {ticketsLoading && (
              <p className="empty-state">Chargement des tickets…</p>
            )}

            {ticketsError && (
              <p className="error-message" role="alert">
                {ticketsError}
              </p>
            )}

            {!ticketsLoading && !ticketsError && tickets.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">✓</span>
                <strong>
                  {isTechnician
                    ? "Aucun ticket assigné"
                    : "Aucun ticket pour le moment"}
                </strong>
                <p>
                  {isTechnician
                    ? "Les tickets qui te seront assignés apparaîtront ici."
                    : "Les demandes apparaîtront ici."}
                </p>
              </div>
            )}

            {!ticketsLoading && !ticketsError && tickets.length > 0 && (
              <div className="table-wrapper">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th>Demande</th>
                      <th>Catégorie</th>
                      <th>Priorité</th>
                      <th>Statut</th>
                      <th>Créé par</th>
                      {isAdmin && <th>Technicien assigné</th>}
                      {isTechnician && <th>Action</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <strong>
                            #{ticket.id} · {ticket.title}
                          </strong>
                          <small>{ticket.description}</small>
                        </td>

                        <td>{ticket.category_name ?? "Non classé"}</td>

                        <td>
                          {isAdmin ? (
                            <select
                              aria-label={`Priorité du ticket ${ticket.id}`}
                              value={ticket.priority}
                              disabled={updatingTicketId === ticket.id}
                              onChange={(event) =>
                                updateTicket(ticket, {
                                  priority: event.target.value as Ticket["priority"],
                                })
                              }
                            >
                              {priorityOptions.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priorityLabels[priority]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`priority priority-${ticket.priority}`}
                            >
                              {priorityLabels[ticket.priority]}
                            </span>
                          )}
                        </td>

                        <td>
                          {isTechnician ? (
                            <select
                              aria-label={`Statut du ticket ${ticket.id}`}
                              value={ticket.status}
                              disabled={updatingTicketId === ticket.id}
                              onChange={(event) =>
                                updateTicket(ticket, {
                                  status: event.target.value as Ticket["status"],
                                })
                              }
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabels[status]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`status status-${ticket.status}`}
                            >
                              {statusLabels[ticket.status]}
                            </span>
                          )}
                        </td>

                        <td>{ticket.created_by}</td>

                        {isAdmin && (
                          <td>
                            <select
                              aria-label={`Technicien assigné au ticket ${ticket.id}`}
                              value={ticket.assigned_to ?? ""}
                              disabled={updatingTicketId === ticket.id}
                              onChange={(event) =>
                                updateTicket(ticket, {
                                  assigned_to: event.target.value || null,
                                })
                              }
                            >
                              <option value="">Non assigné</option>
                              {technicians.map((technician) => (
                                <option
                                  key={technician.id}
                                  value={technician.username}
                                >
                                  {technician.username}
                                  {technician.email ? ` (${technician.email})` : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}

                        {isTechnician && (
                          <td>
                            {updatingTicketId === ticket.id
                              ? "Enregistrement…"
                              : "Modification directe"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
            </>
          ) : (
            <section className="tickets-panel">
              <div className="panel-heading">
                <div>
                  <h2>Gestion des utilisateurs</h2>
                  <p>Consulte les comptes et crée de nouveaux utilisateurs.</p>
                </div>
                <span className="ticket-count">{users.length} compte(s)</span>
              </div>

              {userSuccess && <p className="success-message" role="status">{userSuccess}</p>}
              {usersError && <p className="error-message" role="alert">{usersError}</p>}

              <form className="ticket-form" onSubmit={handleCreateUser}>
                <div className="ticket-form-heading">
                  <h2>Créer un compte</h2>
                  <p>Le mot de passe doit contenir au moins 12 caractères.</p>
                </div>
                <label htmlFor="new-user-username">Nom d’utilisateur</label>
                <input id="new-user-username" value={newUsername} onChange={(event) => setNewUsername(event.target.value)} autoComplete="off" required />
                <label htmlFor="new-user-email">Adresse e-mail</label>
                <input id="new-user-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required />
                <label htmlFor="new-user-password">Mot de passe</label>
                <input id="new-user-password" type="password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
                <label htmlFor="new-user-role">Rôle</label>
                <select id="new-user-role" value={newRole} onChange={(event) => setNewRole(event.target.value as "employee" | "technician")}>
                  <option value="employee">Employé</option>
                  <option value="technician">Technicien</option>
                </select>
                <button type="submit" disabled={userSubmitting}>
                  {userSubmitting ? "Création…" : "Créer le compte"}
                </button>
              </form>

              <div className="panel-heading">
                <div><h2>Comptes existants</h2></div>
                <button type="button" className="logout-button" onClick={() => void loadUsers()} disabled={usersLoading}>
                  {usersLoading ? "Chargement…" : "Actualiser"}
                </button>
              </div>
              {usersLoading ? (
                <p className="empty-state">Chargement des utilisateurs…</p>
              ) : users.length === 0 ? (
                <p className="empty-state">Aucun utilisateur à afficher.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="tickets-table">
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th>E-mail</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isCurrentUser = user.id === profile.id;

                        return (
                          <tr key={user.id}>
                            <td><strong>{user.username}</strong></td>
                            <td>{user.email || "—"}</td>
                            <td>
                              <select
                                aria-label={`Rôle de ${user.username}`}
                                value={user.role}
                                disabled={isCurrentUser}
                                onChange={(event) =>
                                  void updateUser(user, {
                                    role: event.target.value as ManagedUser["role"],
                                  })
                                }
                              >
                                <option value="employee">Employé</option>
                                <option value="technician">Technicien</option>
                                <option value="admin">Administrateur</option>
                              </select>
                            </td>
                            <td>
                              <span className={`status status-${user.is_active ? "resolved" : "closed"}`}>
                                {user.is_active ? "Actif" : "Désactivé"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="logout-button"
                                disabled={isCurrentUser}
                                title={isCurrentUser ? "Tu ne peux pas désactiver ton propre compte." : undefined}
                                onClick={() =>
                                  void updateUser(user, { is_active: !user.is_active })
                                }
                              >
                                {user.is_active ? "Désactiver" : "Activer"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">H</div>
        <p className="eyebrow">ESPACE DE TRAVAIL</p>
        <h1>Bienvenue sur Helpdesk Pro</h1>
        <p className="subtitle">
          Connecte-toi pour gérer tes demandes informatiques.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Nom d'utilisateur</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="security-note">
          Connexion sécurisée · Helpdesk Pro
        </p>
      </section>
    </main>
  );
}

export default App;
