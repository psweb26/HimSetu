from fastapi import Depends

from models import Officer
from security import require_admin_user


def admin_actor(actor: Officer = Depends(require_admin_user)) -> Officer:
    return actor
