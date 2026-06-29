import logging

import resend

from app.config import settings

_log = logging.getLogger("boulga.email")


def send_reset_password_email(email: str, name: str, reset_link: str) -> None:
    if not settings.RESEND_API_KEY:
        _log.warning("RESEND_API_KEY non configurée — email de reset non envoyé")
        return

    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send({
        "from": "Boulga <noreply@boulga.ai>",
        "to": [email],
        "subject": "Réinitialisation de votre mot de passe",
        "html": (
            f"<p>Bonjour {name},</p>"
            f"<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>"
            f'<p><a href="{reset_link}" style="display:inline-block;padding:12px 24px;'
            f'background-color:#1565C0;color:#ffffff;text-decoration:none;border-radius:8px;'
            f'font-weight:500;">Réinitialiser mon mot de passe</a></p>'
            f"<p>Ce lien expire dans 1 heure.</p>"
            f"<p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>"
            f"<p>— L'équipe Boulga</p>"
        ),
    })
