FROM python:3.10-slim-bullseye

# Installer les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Créer un utilisateur non-root
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Définir le dossier de travail
WORKDIR /app

# Copier les fichiers requis
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Définir les variables d’environnement
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000

# Donner les permissions à l'utilisateur non-root
RUN chown -R appuser:appuser /app

# Passer à l'utilisateur non-root
USER appuser

# Commande de démarrage
CMD ["python", "-u", "app.py"]
