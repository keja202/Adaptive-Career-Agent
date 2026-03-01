from __future__ import annotations

from io import BytesIO
from typing import Iterable

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

from .models import ProfileInput, RoadmapResponse


def _wrap_text(*, c: canvas.Canvas, text: str, max_width: float, font_name: str, font_size: int) -> list[str]:
    if not text:
        return [""]
    words = str(text).split()
    lines: list[str] = []
    cur: list[str] = []

    for w in words:
        cand = (" ".join(cur + [w])).strip()
        if not cand:
            continue
        if stringWidth(cand, font_name, font_size) <= max_width:
            cur.append(w)
            continue

        if cur:
            lines.append(" ".join(cur))
            cur = [w]
            continue

        chunk = ""
        for ch in w:
            if stringWidth(chunk + ch, font_name, font_size) <= max_width:
                chunk += ch
            else:
                if chunk:
                    lines.append(chunk)
                chunk = ch
        if chunk:
            cur = [chunk]

    if cur:
        lines.append(" ".join(cur))
    return lines or [""]


def _ensure_space(
    *,
    c: canvas.Canvas,
    y: float,
    height: float,
    top_y: float,
    min_y: float,
    font_name: str,
    font_size: int,
    on_new_page,
) -> float:
    if y < min_y:
        c.showPage()
        on_new_page()
        c.setFont(font_name, font_size)
        return top_y
    return y


def _draw_wrapped(
    *,
    c: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    max_width: float,
    height: float,
    top_y: float,
    min_y: float,
    font_name: str,
    font_size: int,
    line_gap: float,
    on_new_page,
) -> float:
    c.setFont(font_name, font_size)
    lines = _wrap_text(c=c, text=text, max_width=max_width, font_name=font_name, font_size=font_size)
    for line in lines:
        y = _ensure_space(
            c=c,
            y=y,
            height=height,
            top_y=top_y,
            min_y=min_y,
            font_name=font_name,
            font_size=font_size,
            on_new_page=on_new_page,
        )
        c.drawString(x, y, line)
        y -= line_gap
    return y


def _draw_link_wrapped(
    *,
    c: canvas.Canvas,
    x: float,
    y: float,
    url: str,
    max_width: float,
    height: float,
    top_y: float,
    min_y: float,
    font_name: str,
    font_size: int,
    line_gap: float,
    on_new_page,
) -> float:
    c.setFont(font_name, font_size)
    lines = _wrap_text(c=c, text=url, max_width=max_width, font_name=font_name, font_size=font_size)
    for line in lines:
        y = _ensure_space(
            c=c,
            y=y,
            height=height,
            top_y=top_y,
            min_y=min_y,
            font_name=font_name,
            font_size=font_size,
            on_new_page=on_new_page,
        )
        c.drawString(x, y, line)
        w = stringWidth(line, font_name, font_size)
        c.linkURL(url, (x, y - 2, x + w, y + font_size), relative=0)
        y -= line_gap
    return y


def generate_roadmap_pdf(*, roadmap: RoadmapResponse, profile: ProfileInput) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    left = 0.80 * inch
    right = 0.70 * inch
    header_h = 0.62 * inch
    footer_h = 0.45 * inch
    top_y = height - header_h - 0.35 * inch
    min_y = footer_h
    max_width = width - left - right

    page_num = [1]

    h1 = ("Helvetica-Bold", 16)
    h2 = ("Helvetica-Bold", 12)
    h3 = ("Helvetica-Bold", 10)
    body = ("Helvetica", 10)
    small = ("Helvetica", 9)

    gap_h1 = 0.34 * inch
    gap_section = 0.30 * inch
    gap_line = 0.20 * inch
    gap_wrap = 0.17 * inch
    gap_card = 0.22 * inch

    c.setTitle("Roadmap")

    def draw_header_footer() -> None:
        c.setFillColorRGB(0.06, 0.10, 0.20)
        c.rect(0, height - header_h, width, header_h, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(left, height - 0.38 * inch, "AI Specialization Decision Agent")
        c.setFont("Helvetica", 9)
        c.drawRightString(width - right, height - 0.38 * inch, str(roadmap.career_title))

        c.setFillColorRGB(0.75, 0.80, 0.92)
        c.rect(0, height - header_h, width, 1, fill=1, stroke=0)

        c.setFillColorRGB(0.55, 0.60, 0.72)
        c.rect(left, footer_h, width - left - right, 0.5, fill=1, stroke=0)
        c.setFillColorRGB(0.25, 0.28, 0.36)
        c.setFont("Helvetica", 9)
        c.drawString(left, 0.30 * inch, f"Generated roadmap PDF")
        c.drawRightString(width - right, 0.30 * inch, f"Page {page_num[0]}")
        c.setFillColorRGB(0, 0, 0)

    def on_new_page() -> None:
        page_num[0] += 1
        draw_header_footer()

    draw_header_footer()
    y = top_y

    card_pad_x = 12
    card_pad_y = 10
    card_fill = (0.97, 0.98, 1.0)
    card_stroke = (0.82, 0.86, 0.94)
    label_color = (0.25, 0.30, 0.42)
    accent = (0.12, 0.38, 0.82)
    label_font = ("Helvetica-Bold", 10)

    def ensure_block_space(block_h: float, font_name: str, font_size: int) -> None:
        nonlocal y
        if y - block_h < min_y:
            c.showPage()
            on_new_page()
            c.setFont(font_name, font_size)
            y = top_y

    def _wrap_lines(text: str, max_w: float, font_name: str, font_size: int) -> list[str]:
        return _wrap_text(c=c, text=text, max_width=max_w, font_name=font_name, font_size=font_size)

    def draw_card(*, title: str, rows: list[str]) -> None:
        nonlocal y

        inner_w = max_width - (2 * card_pad_x)
        title_lines = _wrap_lines(title, inner_w, h3[0], h3[1])

        label_set = {"Focus", "Projects", "Outcomes"}
        styled_lines: list[tuple[str, str]] = []
        for row in rows:
            if row == "":
                styled_lines.append(("", "spacer"))
                continue
            style = "label" if row in label_set else "body"
            font_name, font_size = (label_font if style == "label" else body)
            for ln in _wrap_lines(row, inner_w, font_name, font_size):
                styled_lines.append((ln, style))

        line_h = gap_wrap
        title_h = (len(title_lines) * line_h)
        body_h = (len(styled_lines) * line_h)
        card_h = (2 * card_pad_y) + title_h + (0.06 * inch) + body_h

        ensure_block_space(card_h, body[0], body[1])

        x = left
        top = y
        bottom = y - card_h
        c.setFillColorRGB(*card_fill)
        c.setStrokeColorRGB(*card_stroke)
        c.roundRect(x, bottom, max_width, card_h, 10, stroke=1, fill=1)
        c.setFillColorRGB(0, 0, 0)

        ty = top - card_pad_y - line_h + 2
        c.setFont(*h3)
        c.setFillColorRGB(0.08, 0.12, 0.22)
        for tl in title_lines:
            c.drawString(x + card_pad_x, ty, tl)
            ty -= line_h

        c.setFillColorRGB(*card_stroke)
        c.rect(x + card_pad_x, ty + 0.06 * inch, max_width - (2 * card_pad_x), 0.6, fill=1, stroke=0)
        c.setFillColorRGB(0, 0, 0)
        ty -= 0.08 * inch

        for wl, style in styled_lines:
            if style == "label":
                c.setFont(*label_font)
                c.setFillColorRGB(*accent)
                c.drawString(x + card_pad_x, ty, wl)
                c.setFillColorRGB(0, 0, 0)
            elif style == "spacer":
                pass
            else:
                c.setFont(*body)
                c.drawString(x + card_pad_x, ty, wl)
            ty -= line_h

        y = bottom - gap_card

    c.setFont("Helvetica", 11)
    y = _draw_wrapped(
        c=c,
        x=left,
        y=y,
        text=f"Career roadmap: {roadmap.career_title} ({roadmap.career_id})",
        max_width=max_width,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name="Helvetica",
        font_size=11,
        line_gap=gap_line,
        on_new_page=on_new_page,
    )
    c.setFont(*body)
    y = _draw_wrapped(
        c=c,
        x=left,
        y=y,
        text=f"Experience level: {roadmap.experience_level}",
        max_width=max_width,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=body[0],
        font_size=body[1],
        line_gap=gap_wrap,
        on_new_page=on_new_page,
    )
    y = _draw_wrapped(
        c=c,
        x=left,
        y=y,
        text=f"Gap: {roadmap.gap.gap_percent:.1f}%",
        max_width=max_width,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=body[0],
        font_size=body[1],
        line_gap=gap_wrap,
        on_new_page=on_new_page,
    )
    y -= gap_section

    y = _ensure_space(
        c=c,
        y=y,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=h2[0],
        font_size=h2[1],
        on_new_page=on_new_page,
    )
    c.setFillColorRGB(0.94, 0.95, 0.98)
    c.rect(left, y - 0.12 * inch, max_width, 0.32 * inch, fill=1, stroke=0)
    c.setFillColorRGB(0.08, 0.12, 0.22)
    c.setFont(*h2)
    c.drawString(left + 10, y, "Profile")
    c.setFillColorRGB(0, 0, 0)
    y -= 0.28 * inch

    skills = ", ".join(profile.skills[:25]) if profile.skills else "—"
    interests = ", ".join(profile.interests[:25]) if profile.interests else "—"
    y = _draw_wrapped(
        c=c,
        x=left,
        y=y,
        text=f"Skills: {skills}",
        max_width=max_width,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=body[0],
        font_size=body[1],
        line_gap=gap_wrap,
        on_new_page=on_new_page,
    )
    y = _draw_wrapped(
        c=c,
        x=left,
        y=y,
        text=f"Interests: {interests}",
        max_width=max_width,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=body[0],
        font_size=body[1],
        line_gap=gap_wrap,
        on_new_page=on_new_page,
    )
    y -= gap_section

    y = _ensure_space(
        c=c,
        y=y,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=h2[0],
        font_size=h2[1],
        on_new_page=on_new_page,
    )
    c.setFillColorRGB(0.94, 0.95, 0.98)
    c.rect(left, y - 0.12 * inch, max_width, 0.32 * inch, fill=1, stroke=0)
    c.setFillColorRGB(0.08, 0.12, 0.22)
    c.setFont(*h2)
    c.drawString(left + 10, y, "Timeline (6 months)")
    c.setFillColorRGB(0, 0, 0)
    y -= 0.28 * inch

    for phase in roadmap.timeline:
        rows: list[str] = []
        c.setFillColorRGB(*label_color)
        rows.append("Focus")
        c.setFillColorRGB(0, 0, 0)
        if phase.focus:
            for item in phase.focus:
                rows.append(f"- {item}")
        else:
            rows.append("- —")
        rows.append("")
        rows.append("Projects")
        if phase.projects:
            for item in phase.projects:
                rows.append(f"- {item}")
        else:
            rows.append("- —")

        draw_card(title=f"{phase.months} — {phase.title}", rows=rows)

    y = _ensure_space(
        c=c,
        y=y,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=h2[0],
        font_size=h2[1],
        on_new_page=on_new_page,
    )
    c.setFillColorRGB(0.94, 0.95, 0.98)
    c.rect(left, y - 0.12 * inch, max_width, 0.32 * inch, fill=1, stroke=0)
    c.setFillColorRGB(0.08, 0.12, 0.22)
    c.setFont(*h2)
    c.drawString(left + 10, y, "Project suggestions")
    c.setFillColorRGB(0, 0, 0)
    y -= 0.28 * inch

    for p in roadmap.project_suggestions:
        rows: list[str] = []
        rows.append("Outcomes")
        if p.outcomes:
            for item in p.outcomes:
                rows.append(f"- {item}")
        else:
            rows.append("- —")

        draw_card(title=f"{p.title} ({p.difficulty})", rows=rows)

    y = _ensure_space(
        c=c,
        y=y,
        height=height,
        top_y=top_y,
        min_y=min_y,
        font_name=h2[0],
        font_size=h2[1],
        on_new_page=on_new_page,
    )
    c.setFillColorRGB(0.94, 0.95, 0.98)
    c.rect(left, y - 0.12 * inch, max_width, 0.32 * inch, fill=1, stroke=0)
    c.setFillColorRGB(0.08, 0.12, 0.22)
    c.setFont(*h2)
    c.drawString(left + 10, y, "Resources")
    c.setFillColorRGB(0, 0, 0)
    y -= 0.28 * inch

    for r in roadmap.learning_resources:
        y = _ensure_space(
            c=c,
            y=y,
            height=height,
            top_y=top_y,
            min_y=min_y,
            font_name=body[0],
            font_size=body[1],
            on_new_page=on_new_page,
        )
        y = _draw_wrapped(
            c=c,
            x=left,
            y=y,
            text=f"{r.kind}: {r.title}",
            max_width=max_width,
            height=height,
            top_y=top_y,
            min_y=min_y,
            font_name=body[0],
            font_size=body[1],
            line_gap=gap_wrap,
            on_new_page=on_new_page,
        )
        c.setFillColorRGB(0.12, 0.38, 0.82)
        y = _draw_link_wrapped(
            c=c,
            x=left + 12,
            y=y,
            url=str(r.url),
            max_width=max_width - 12,
            height=height,
            top_y=top_y,
            min_y=min_y,
            font_name=small[0],
            font_size=small[1],
            line_gap=gap_wrap,
            on_new_page=on_new_page,
        )
        c.setFillColorRGB(0, 0, 0)
        y -= gap_line

    c.showPage()
    c.save()
    return buf.getvalue()
