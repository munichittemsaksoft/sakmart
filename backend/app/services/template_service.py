"""
Template CRUD and business logic.
"""
from __future__ import annotations
import math
import uuid
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.models.models import Template, Agent, Fork, Star, Review, Asset, TemplateStatus, AgentProduct, Skill
from app.schemas.schemas import TemplateCreate, TemplateUpdate, ForkCreate, ReviewCreate
from slugify import slugify


def _unique_slug(db: Session, title: str) -> str:
    base = slugify(title)
    slug = base
    i = 1
    while db.query(Template).filter(Template.slug == slug).first():
        slug = f"{base}-{i}"
        i += 1
    return slug


def get_templates(
    db: Session,
    *,
    page: int = 1,
    size: int = 12,
    category: str | None = None,
    status: str | None = "published",
    author_id: uuid.UUID | None = None,
    search: str | None = None,
    tag: str | None = None,
    sort_by: str = "created_at",
):
    q = (
        db.query(Template)
        .options(joinedload(Template.author), joinedload(Template.agents))
    )
    if status is not None:
        q = q.filter(Template.status == status)
    if author_id is not None:
        q = q.filter(Template.author_id == author_id)
    if category:
        q = q.filter(Template.category == category)
    if search:
        q = q.filter(
            or_(
                Template.title.ilike(f"%{search}%"),
                Template.description.ilike(f"%{search}%"),
            )
        )
    if tag:
        q = q.filter(Template.tags.contains([tag]))

    total = q.count()

    order_col = {
        "created_at": Template.created_at.desc(),
        "fork_count": Template.fork_count.desc(),
        "star_count": Template.star_count.desc(),
        "view_count": Template.view_count.desc(),
    }.get(sort_by, Template.created_at.desc())

    items = q.order_by(order_col).offset((page - 1) * size).limit(size).all()
    return items, total, math.ceil(total / size)


def get_template(db: Session, slug: str) -> Template | None:
    t = (
        db.query(Template)
        .options(
            joinedload(Template.author),
            joinedload(Template.agents),
            joinedload(Template.marketplace_agents).joinedload(AgentProduct.author),
            joinedload(Template.marketplace_skills).joinedload(Skill.author),
        )
        .filter(Template.slug == slug)
        .first()
    )
    if t:
        t.view_count = (t.view_count or 0) + 1
        db.commit()
    return t


def create_template(db: Session, data: TemplateCreate, author_id: uuid.UUID) -> Template:
    slug = _unique_slug(db, data.title)
    agents_data = data.agents
    agent_slugs = data.agent_slugs
    skill_slugs = data.skill_slugs
    template_data = data.model_dump(exclude={"agents", "agent_slugs", "skill_slugs"})

    t = Template(**template_data, slug=slug, author_id=author_id, status=TemplateStatus.published)
    db.add(t)
    db.flush()

    for i, a in enumerate(agents_data):
        agent = Agent(**a.model_dump(exclude={"position"}), template_id=t.id, position=a.position or i)
        db.add(agent)

    if agent_slugs:
        t.marketplace_agents = db.query(AgentProduct).filter(AgentProduct.slug.in_(agent_slugs)).all()
    if skill_slugs:
        t.marketplace_skills = db.query(Skill).filter(Skill.slug.in_(skill_slugs)).all()

    db.commit()
    return (
        db.query(Template)
        .options(
            joinedload(Template.author),
            joinedload(Template.agents),
            joinedload(Template.marketplace_agents).joinedload(AgentProduct.author),
            joinedload(Template.marketplace_skills).joinedload(Skill.author),
        )
        .filter(Template.id == t.id)
        .one()
    )


def update_template(db: Session, template: Template, data: TemplateUpdate) -> Template:
    update_data = data.model_dump(exclude_none=True)
    agent_slugs = update_data.pop("agent_slugs", None)
    skill_slugs = update_data.pop("skill_slugs", None)

    for field, value in update_data.items():
        setattr(template, field, value)

    if agent_slugs is not None:
        template.marketplace_agents = db.query(AgentProduct).filter(AgentProduct.slug.in_(agent_slugs)).all()
    if skill_slugs is not None:
        template.marketplace_skills = db.query(Skill).filter(Skill.slug.in_(skill_slugs)).all()

    db.commit()
    return (
        db.query(Template)
        .options(
            joinedload(Template.author),
            joinedload(Template.agents),
            joinedload(Template.marketplace_agents).joinedload(AgentProduct.author),
            joinedload(Template.marketplace_skills).joinedload(Skill.author),
        )
        .filter(Template.id == template.id)
        .one()
    )


def delete_template(db: Session, template: Template) -> None:
    db.delete(template)
    db.commit()


def fork_template(db: Session, template: Template, user_id: uuid.UUID, data: ForkCreate) -> Fork:
    fork = Fork(template_id=template.id, user_id=user_id, custom_config=data.custom_config)
    db.add(fork)
    template.fork_count = (template.fork_count or 0) + 1
    db.commit()
    db.refresh(fork)
    return fork


def toggle_star(db: Session, template: Template, user_id: uuid.UUID) -> bool:
    existing = db.query(Star).filter_by(template_id=template.id, user_id=user_id).first()
    if existing:
        db.delete(existing)
        template.star_count = max(0, (template.star_count or 0) - 1)
        db.commit()
        return False
    star = Star(template_id=template.id, user_id=user_id)
    db.add(star)
    template.star_count = (template.star_count or 0) + 1
    db.commit()
    return True


def add_review(db: Session, template: Template, user_id: uuid.UUID, data: ReviewCreate) -> Review:
    review = Review(template_id=template.id, user_id=user_id, **data.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def get_reviews(db: Session, template_id: uuid.UUID):
    return (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.template_id == template_id)
        .order_by(Review.created_at.desc())
        .all()
    )
