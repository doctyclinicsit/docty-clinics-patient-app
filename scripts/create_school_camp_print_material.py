from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import qr
from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUTPUT = ROOT / "output" / "pdf"
PDF_PATH = OUTPUT / "docty-sri-gayathri-wellness-camp-a5-front-back.pdf"
COLLAB_URL = "https://docty-clinics-patient-app-eta.vercel.app/school-camp-collaboration"


def hex_color(value: str):
    return colors.HexColor(value)


def rounded(c, x, y, w, h, fill, stroke=None, radius=8, stroke_width=1):
    c.saveState()
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.setLineWidth(stroke_width)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if stroke else 0)
    c.restoreState()


def image_fit(c, path, x, y, w, h):
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")


def wrapped(c, text, x, y, width, font="Helvetica", size=9, leading=11, color=colors.black, max_lines=None):
    c.saveState()
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    lines = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if c.stringWidth(trial, font, size) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if max_lines:
        lines = lines[:max_lines]
    for index, line in enumerate(lines):
        c.drawString(x, y - index * leading, line)
    c.restoreState()
    return y - len(lines) * leading


def qr_code(c, value, x, y, size):
    widget = qr.QrCodeWidget(value)
    bounds = widget.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = renderPDF.Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, c, x, y)


def draw_logo_lockup(c, x, y, w=260, h=38):
    border = hex_color("#dceaf1")
    rounded(c, x, y, w, h, colors.white, radius=7)
    image_fit(c, PUBLIC / "docty-logo-full.png", x + 10, y + 7, 90, 24)
    c.setStrokeColor(border)
    c.line(x + 112, y + 8, x + 112, y + h - 8)
    image_fit(c, PUBLIC / "sri-gayathri-techno-school-logo.png", x + 125, y + 7, w - 138, 24)


def draw_front(c):
    w, h = A5
    teal = hex_color("#082f49")
    blue = hex_color("#0b7fae")
    pink = hex_color("#fe065c")
    pale = hex_color("#f6fbfd")
    muted = hex_color("#476477")
    sky = hex_color("#eaf8fe")
    ink = hex_color("#082f49")
    border = hex_color("#dceaf1")

    c.setFillColor(teal)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(hex_color("#087da9"))
    c.circle(w - 45, h - 64, 108, fill=1, stroke=0)
    c.setFillColor(hex_color("#fe065c"))
    c.circle(w + 6, 108, 126, fill=1, stroke=0)
    c.setFillColor(hex_color("#10b6d8"))
    c.circle(8, 72, 100, fill=1, stroke=0)
    c.saveState()
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.06))
    c.rotate(18)
    c.rect(150, 240, 340, 42, fill=1, stroke=0)
    c.restoreState()

    draw_logo_lockup(c, 22, h - 58, w - 44, 36)

    rounded(c, 22, h - 94, 146, 18, colors.Color(1, 1, 1, alpha=0.14), colors.Color(1, 1, 1, alpha=0.28), radius=7)
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(colors.white)
    c.drawString(32, h - 88, "School Health Collaboration")

    rounded(c, 22, h - 158, w - 44, 50, colors.Color(1, 1, 1, alpha=0.10), colors.Color(1, 1, 1, alpha=0.20), radius=10)
    c.setFont("Helvetica-Bold", 21)
    c.setFillColor(colors.white)
    c.drawString(36, h - 130, "Docty & Sri Gayathri")
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(hex_color("#8ee4ff"))
    c.drawString(36, h - 149, "Collaboration")

    c.setFont("Helvetica-Bold", 30)
    c.setFillColor(colors.white)
    c.drawString(22, h - 202, "Little Champs")
    c.drawString(22, h - 236, "Wellness Camp")

    c.setFont("Helvetica-Bold", 13)
    c.drawString(22, h - 262, "Sri Gayathri Techno Schools, Manikonda")

    stat_items = ["5 Saturdays", "On Campus Camp", "Live Assessment", "AI Reports"]
    card_w = (w - 56) / 2
    for idx, item in enumerate(stat_items):
        x = 22 + (idx % 2) * (card_w + 12)
        y = h - 328 - (idx // 2) * 46
        rounded(c, x, y, card_w, 36, colors.Color(1, 1, 1, alpha=0.18), colors.Color(1, 1, 1, alpha=0.20), radius=8)
        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColor(colors.white)
        tw = c.stringWidth(item, "Helvetica-Bold", 10.5)
        c.drawString(x + (card_w - tw) / 2, y + 14, item)

    offer_y = 42
    rounded(c, 22, offer_y, w - 44, 116, colors.white, border, radius=12)
    rounded(c, 22, offer_y + 86, w - 44, 30, pink, radius=12)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.white)
    c.drawString(38, offer_y + 97, "Exclusive Docty Total Care Subscription Offer")
    c.setFont("Helvetica", 7.8)
    c.setFillColor(hex_color("#7a1238"))
    c.drawString(38, offer_y + 72, "Special school community pricing during the camp campaign.")

    rounded(c, 38, offer_y + 14, 126, 48, sky, hex_color("#b8d7e4"), radius=8)
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(ink)
    c.drawString(49, offer_y + 47, "Students & Staff")
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(hex_color("#8aa0ad"))
    c.drawString(49, offer_y + 36, "Rs 999/-")
    c.setStrokeColor(hex_color("#8aa0ad"))
    c.setLineWidth(1)
    c.line(49, offer_y + 39, 85, offer_y + 39)
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(blue)
    c.drawString(49, offer_y + 17, "Rs 199/-")

    rounded(c, 178, offer_y + 14, 126, 48, hex_color("#fff6fa"), hex_color("#ffd0df"), radius=8)
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(ink)
    c.drawString(189, offer_y + 47, "Family Members")
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(hex_color("#8aa0ad"))
    c.drawString(189, offer_y + 36, "Rs 999/-")
    c.setStrokeColor(hex_color("#8aa0ad"))
    c.setLineWidth(1)
    c.line(189, offer_y + 39, 225, offer_y + 39)
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(pink)
    c.drawString(189, offer_y + 17, "Rs 399/-")

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.white)
    c.drawCentredString(w / 2, 21, "For bookings and details: 99898 04888")


def draw_back(c):
    w, h = A5
    teal = hex_color("#082f49")
    blue = hex_color("#0b7fae")
    pink = hex_color("#fe065c")
    pale = hex_color("#f6fbfd")
    muted = hex_color("#476477")
    sky = hex_color("#eaf8fe")
    ink = hex_color("#082f49")
    border = hex_color("#dceaf1")

    c.setFillColor(pale)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    draw_logo_lockup(c, 22, h - 58, w - 44, 36)

    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(ink)
    c.drawString(22, h - 90, "Camp Highlights")
    c.setFont("Helvetica", 8.8)
    c.setFillColor(muted)
    c.drawString(22, h - 106, "A parent-friendly wellness program with structured assessments and follow-up pathways.")

    highlights = [
        ("Child Wellness Screening", "Nutrition, oral, growth, mental wellness and vaccination awareness."),
        ("Interactive Parent Experience", "Live guided questions with helpful notes after every response."),
        ("Personalised AI Reports", "Mobile-verified wellness reports with care prompts and suggested next steps."),
    ]
    y = h - 170
    for idx, (title, text) in enumerate(highlights):
        x = 22 + idx * ((w - 56) / 3 + 6)
        cw = (w - 56) / 3
        rounded(c, x, y, cw, 54, colors.white, border, radius=8)
        c.setFont("Helvetica-Bold", 8.6)
        c.setFillColor(ink)
        wrapped(c, title, x + 9, y + 38, cw - 18, "Helvetica-Bold", 8.4, 10, ink, max_lines=2)
        wrapped(c, text, x + 9, y + 18, cw - 18, "Helvetica", 6.8, 8, muted, max_lines=3)

    rounded(c, 22, h - 302, w - 44, 100, teal, radius=11)
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.white)
    c.drawString(38, h - 229, "Clinician on Campus")
    c.setFont("Helvetica", 8.4)
    c.setFillColor(hex_color("#d7eef8"))
    c.drawString(38, h - 245, "Multi-speciality support for parent conversations.")
    specialties = ["Pediatrics", "Dental", "Psychiatry", "Nutrition", "Eye", "Audiometry"]
    sx = 38
    sy = h - 274
    for index, specialty in enumerate(specialties):
        chip_w = c.stringWidth(specialty, "Helvetica-Bold", 7.3) + 16
        if sx + chip_w > w - 38:
            sx = 38
            sy -= 22
        rounded(c, sx, sy, chip_w, 17, colors.Color(1, 1, 1, alpha=0.12), colors.Color(1, 1, 1, alpha=0.24), radius=7)
        c.setFont("Helvetica-Bold", 7.3)
        c.setFillColor(colors.white)
        c.drawString(sx + 8, sy + 5, specialty)
        sx += chip_w + 7

    # Report snapshot
    snap_y = 98
    rounded(c, 22, snap_y, 214, 88, colors.white, border, radius=9)
    rounded(c, 22, snap_y + 58, 214, 30, teal, radius=9)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(hex_color("#8ee4ff"))
    c.drawString(36, snap_y + 77, "Docty Health Passport")
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.white)
    c.drawString(36, snap_y + 62, "Sample Student")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(ink)
    c.drawString(36, snap_y + 42, "AI Health Passport Insight")
    wrapped(
        c,
        "Includes height, weight, BMI, nutrition, oral and mental wellbeing scores, vaccination reminders and WHO growth chart review.",
        36,
        snap_y + 27,
        176,
        "Helvetica",
        7.1,
        9,
        muted,
        max_lines=3,
    )

    rounded(c, 248, snap_y, w - 270, 88, colors.white, border, radius=9)
    qr_code(c, COLLAB_URL, 262, snap_y + 24, 44)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(ink)
    c.drawString(312, snap_y + 57, "Scan for")
    c.drawString(312, snap_y + 46, "camp details")
    c.setFont("Helvetica", 6.8)
    c.setFillColor(muted)
    c.drawString(312, snap_y + 33, "and offers")

    rounded(c, 22, 42, w - 44, 38, hex_color("#fff6fa"), radius=8)
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(pink)
    c.drawString(36, 65, "Docty Promotion Offers")
    c.setFont("Helvetica", 7.2)
    c.setFillColor(muted)
    c.drawString(36, 52, "Camp-linked consultation, dental, diagnostics, pharmacy and family wellness offers.")

    c.setFont("Helvetica", 6.2)
    c.setFillColor(muted)
    c.drawString(22, 20, "Offer intended for Sri Gayathri Techno Schools students, staff and their family members during the camp campaign.")
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(blue)
    c.drawRightString(w - 22, 20, "Docty Clinics")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(PDF_PATH), pagesize=A5)
    c.setTitle("Docty x Sri Gayathri Little Champs Wellness Camp A5 Front Back")
    draw_front(c)
    c.showPage()
    draw_back(c)
    c.save()
    print(PDF_PATH)


if __name__ == "__main__":
    main()
