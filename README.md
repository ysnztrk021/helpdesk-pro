# Helpdesk Pro

Application web de support informatique permettant de centraliser les
demandes, de suivre leur traitement et de gérer les utilisateurs selon
leur rôle.

## Fonctionnalités

-   Authentification des utilisateurs avec jetons JWT.
-   Gestion des rôles : **Employé**, **Technicien** et
    **Administrateur**.
-   Création et consultation des tickets de support.
-   Catégories, priorités et statuts des tickets.
-   Assignation des tickets aux techniciens.
-   Mise à jour du statut des tickets par les techniciens.
-   Gestion des utilisateurs par l'administrateur : création de comptes,
    modification des rôles et activation/désactivation.
-   Tableau de bord avec statistiques.
-   Interface sombre et adaptative.

## Technologies

### Frontend

-   React
-   TypeScript
-   Vite
-   CSS

### Backend

-   Python
-   Django
-   Django REST Framework
-   JWT pour l'authentification

### Base de données et environnement

-   PostgreSQL
-   Docker Compose

## Architecture

``` text
helpdesk-pro/
├── backend/       # API Django REST Framework
├── frontend/      # Application React + TypeScript + Vite
└── docker-compose.yml
```

> L'arborescence ci-dessus est indicative. Adapte-la si les fichiers de
> ton dépôt sont organisés différemment.

## Prérequis

-   Git
-   Python et pip
-   Node.js et npm
-   Docker et Docker Compose
-   Les variables de configuration nécessaires à Django et PostgreSQL

## Installation et lancement

Les commandes ci-dessous sont un point de départ. Vérifie les noms des
services, les variables d'environnement et les scripts de ton projet
avant de les publier comme instructions définitives.

### 1. Cloner le dépôt

``` bash
git clone <URL_DU_DEPOT>
cd helpdesk-pro
```

### 2. Démarrer PostgreSQL

Si la base de données est définie dans `docker-compose.yml` :

``` bash
docker compose up -d
```

### 3. Configurer le backend

``` bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Configure les variables d'environnement requises par le projet, puis
applique les migrations :

``` bash
python manage.py migrate
python manage.py runserver
```

L'API Django est généralement disponible à l'adresse
`http://127.0.0.1:8000`, sauf configuration différente.

### 4. Configurer le frontend

Dans un autre terminal :

``` bash
cd frontend
npm install
npm run dev
```

Vite affiche l'adresse locale à ouvrir dans le navigateur.

## Rôles de l'application

  -----------------------------------------------------------------------
  Rôle                                Responsabilités
  ----------------------------------- -----------------------------------
  Employé                             Créer des tickets et suivre ses
                                      demandes.

  Technicien                          Consulter les tickets qui lui sont
                                      assignés et mettre à jour leur
                                      statut.

  Administrateur                      Superviser les tickets, assigner
                                      les techniciens et gérer les
                                      utilisateurs.
  -----------------------------------------------------------------------

## Vérifications

Backend :

``` bash
cd backend
source .venv/bin/activate
python manage.py check
pytest -v
```

Frontend :

``` bash
cd frontend
npm run build
```

Adapte les commandes de test aux outils réellement configurés dans le
dépôt.

## Configuration et sécurité

-   Ne publie jamais de mots de passe, clés secrètes, jetons, fichiers
    `.env` ou données personnelles.
-   Fournis un fichier `.env.example` contenant uniquement des valeurs
    fictives ou des noms de variables, jamais de secrets réels.
-   Vérifie que `.env`, les environnements virtuels, `node_modules`, les
    caches et les fichiers locaux de base de données sont exclus de Git.
-   Pour un déploiement réel, configure HTTPS, des secrets robustes, des
    paramètres Django de production et une politique de mots de passe
    adaptée.
-   Les identifiants de démonstration doivent être documentés séparément
    et ne doivent pas être réutilisés en production.

## État du projet

Le parcours fonctionnel des trois rôles a été testé manuellement dans
l'environnement de développement. Les tests automatisés et la
configuration de déploiement doivent être vérifiés dans l'environnement
utilisé pour la livraison.

## Captures d'écran

Ajoute ici des captures d'écran de l'application, par exemple :

-   `docs/screenshots/login.png`
-   `docs/screenshots/employee-dashboard.png`
-   `docs/screenshots/technician-dashboard.png`
-   `docs/screenshots/admin-users.png`

Utilise uniquement des captures ne contenant pas de données personnelles
ou de secrets.

## Auteur

Projet personnel réalisé pour démontrer des compétences en développement
web full-stack, conception d'API REST, authentification et gestion des
rôles.
