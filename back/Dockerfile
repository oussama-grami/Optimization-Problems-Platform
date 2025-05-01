FROM python:3.10-slim

# Installer les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Définir le dossier de travail
WORKDIR /app

# Copier les fichiers requis
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Définir les variables d’environnement
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=8080

# Exposer le port
EXPOSE 8080

# Commande de démarrage
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]
