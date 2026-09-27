"""Render fictional SPECIMEN documents for the demo personas.

HTML -> headless Chrome screenshot -> PIL "phone photo" treatment.
Outputs public/demo-docs/<persona>_<doctype>.jpg (+ one deliberately blurry copy).
All people, numbers and documents are fictional and watermarked SPECIMEN.
"""
import os
import random
import subprocess
import tempfile
from PIL import Image, ImageFilter, ImageEnhance

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "demo-docs")
os.makedirs(OUT, exist_ok=True)
CHROME = "google-chrome"

BASE_CSS = """
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'FreeSans', 'Noto Sans Devanagari', sans-serif; background: #fff; }
.doc { position: relative; width: WIDTHpx; height: HEIGHTpx; overflow: hidden; padding: 28px 34px; }
.wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 64px; font-weight: 700; color: rgba(200,0,0,0.10); transform: rotate(-18deg); letter-spacing: 6px; pointer-events: none; }
.row { display: flex; gap: 10px; margin: 6px 0; font-size: 20px; }
.k { color: #444; min-width: 250px; }
.v { font-weight: 700; color: #111; }
h1 { font-size: 26px; } h2 { font-size: 20px; font-weight: 600; }
.center { text-align: center; }
.foot { position: absolute; bottom: 14px; left: 34px; right: 34px; font-size: 13px; color: #666; }
table { border-collapse: collapse; width: 100%; font-size: 17px; margin-top: 10px; }
td, th { border: 1px solid #333; padding: 6px 8px; text-align: left; }
</style>
"""


def aadhaar(p):
    return 1000, 630, f"""
<div class="doc" style="background: linear-gradient(180deg,#fff 0%,#fff7ef 100%); border: 2px solid #ddd; border-radius: 18px;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:6px solid #f28c28;padding-bottom:10px;">
    <div><h2>भारत सरकार</h2><h2>Government of India (SPECIMEN)</h2></div>
    <div style="font-size:15px;color:#555;text-align:right">Unique ID card — demo specimen<br/>आधार — नमूना</div>
  </div>
  <div style="display:flex;gap:30px;margin-top:26px;">
    <div style="width:170px;height:210px;background:#e9e3da;border:1px solid #bbb;display:flex;align-items:center;justify-content:center;color:#999;font-size:15px;">PHOTO</div>
    <div>
      <div class="row"><span class="v" style="font-size:26px">{p['name_hi']}</span></div>
      <div class="row"><span class="v" style="font-size:26px">{p['name']}</span></div>
      <div class="row"><span class="k" style="min-width:0">जन्म तिथि / DOB :</span><span class="v">{p['dob']}</span></div>
      <div class="row"><span class="k" style="min-width:0">{p['gender_hi']} / {p['gender']}</span></div>
      <div class="row" style="margin-top:14px"><span class="k" style="min-width:0">पता / Address:</span></div>
      <div class="row" style="font-size:18px;max-width:640px">{p['address']}</div>
    </div>
  </div>
  <div class="center" style="margin-top:26px;font-size:40px;font-weight:700;letter-spacing:6px;">{p['uid']}</div>
  <div class="center" style="border-top:4px solid #d33;margin-top:10px;padding-top:6px;font-size:18px;color:#d33;">मेरा आधार, मेरी पहचान</div>
  <div class="wm">SPECIMEN · DEMO</div>
</div>"""


def ration(p):
    members = "".join(
        f"<tr><td>{i+1}</td><td>{m[0]}</td><td>{m[1]}</td><td>{m[2]}</td></tr>" for i, m in enumerate(p["family"])
    )
    return 1000, 680, f"""
<div class="doc" style="background:#fbfaf2;border:3px double #2d6a2d;">
  <div class="center"><h1 style="color:#2d6a2d">छत्तीसगढ़ शासन — खाद्य, नागरिक आपूर्ति विभाग</h1>
  <h2>राशन कार्ड / Ration Card (SPECIMEN)</h2></div>
  <div class="row" style="margin-top:16px"><span class="k">राशन कार्ड क्र. / Card No.</span><span class="v">{p['ration_no']}</span></div>
  <div class="row"><span class="k">मुखिया का नाम / Head of family</span><span class="v">{p['name_hi']} ({p['name']})</span></div>
  <div class="row"><span class="k">पिता/पति का नाम / Father</span><span class="v">{p['father_hi']}</span></div>
  <div class="row"><span class="k">ग्राम / Village</span><span class="v">{p['village_hi']} ({p['village']})</span></div>
  <div class="row"><span class="k">तहसील, जिला / Tehsil, District</span><span class="v">{p['tehsil']}, {p['district']}</span></div>
  <div class="row"><span class="k">कार्ड का प्रकार / Card type</span><span class="v">{p['card_type']}</span></div>
  <table><tr><th>क्र.</th><th>सदस्य का नाम</th><th>संबंध</th><th>आयु</th></tr>{members}</table>
  <div class="wm">SPECIMEN · DEMO</div>
</div>"""


def b1(p):
    return 1000, 640, f"""
<div class="doc" style="background:#fffef8;border:2px solid #555;">
  <div class="center"><h1>छत्तीसगढ़ भू-अभिलेख — बी-1 (किसान किताब)</h1><h2>B-1 Land Record Extract (SPECIMEN)</h2></div>
  <div class="row" style="margin-top:14px"><span class="k">ग्राम / Village</span><span class="v">{p['village_hi']}</span></div>
  <div class="row"><span class="k">तहसील / Tehsil</span><span class="v">{p['tehsil']}</span></div>
  <div class="row"><span class="k">जिला / District</span><span class="v">{p['district']}</span></div>
  <div class="row"><span class="k">भू-स्वामी / Land owner</span><span class="v">{p['name_hi']} पिता {p['father_hi']}</span></div>
  <table><tr><th>खसरा नं.</th><th>रकबा (हे.)</th><th>भूमि का प्रकार</th><th>फसल</th></tr>
  <tr><td>214/2</td><td>0.81</td><td>असिंचित</td><td>धान</td></tr>
  <tr><td>309</td><td>0.40</td><td>सिंचित</td><td>धान</td></tr></table>
  <div class="row" style="margin-top:14px"><span class="k">वर्ष / Year</span><span class="v">2026-27</span></div>
  <div class="foot">यह नमूना दस्तावेज़ केवल प्रदर्शन हेतु है — Demo specimen only.</div>
  <div class="wm">SPECIMEN · DEMO</div>
</div>"""


def school(p):
    return 1000, 660, f"""
<div class="doc" style="background:#f7fbff;border:3px solid #1d4f91;">
  <div class="center"><h1 style="color:#1d4f91">छत्तीसगढ़ माध्यमिक शिक्षा मंडल, रायपुर</h1>
  <h2>Chhattisgarh Board of Secondary Education — Marksheet (SPECIMEN)</h2>
  <div style="font-size:18px;margin-top:6px">हाई स्कूल सर्टिफिकेट परीक्षा / High School Certificate Examination 2021</div></div>
  <div class="row" style="margin-top:16px"><span class="k">परीक्षार्थी का नाम / Name</span><span class="v">{p['name']} / {p['name_hi']}</span></div>
  <div class="row"><span class="k">पिता का नाम / Father's name</span><span class="v">{p['father']}</span></div>
  <div class="row"><span class="k">जन्म तिथि / Date of birth</span><span class="v">{p['dob']}</span></div>
  <div class="row"><span class="k">विद्यालय / School</span><span class="v">{p['school']}</span></div>
  <div class="row"><span class="k">अनुक्रमांक / Roll No.</span><span class="v">{p['roll']}</span></div>
  <div class="row"><span class="k">परिणाम / Result</span><span class="v">उत्तीर्ण — प्रथम श्रेणी / PASS — FIRST DIVISION (78.4%)</span></div>
  <div class="wm">SPECIMEN · DEMO</div>
</div>"""


def caste(p):
    return 1000, 660, f"""
<div class="doc" style="background:#fffaf5;border:3px double #7a3b00;">
  <div class="center"><h1 style="color:#7a3b00">छत्तीसगढ़ शासन — राजस्व विभाग</h1>
  <h2>स्थायी जाति प्रमाण पत्र / Permanent Caste Certificate (SPECIMEN)</h2></div>
  <div style="font-size:19px;line-height:1.7;margin-top:18px">
  प्रमाणित किया जाता है कि श्री <b>{p['father_hi']}</b> ({p['father']}), पिता श्री <b>{p['grandfather_hi']}</b>,
  निवासी <b>{p['village_hi']}</b>, तहसील {p['tehsil']}, जिला {p['district']}, छत्तीसगढ़ राज्य की
  <b>{p['caste_hi']} ({p['caste']})</b> जाति के सदस्य हैं, जिसे <b>अनुसूचित जाति</b> के रूप में मान्यता प्राप्त है।
  <br/>This is to certify that Shri {p['father']} belongs to the <b>{p['caste']}</b> caste, recognised as a Scheduled Caste.
  </div>
  <div class="row" style="margin-top:18px"><span class="k">प्रमाण पत्र क्र. / Cert. No.</span><span class="v">CG/RVN/JP/1998/004417</span></div>
  <div class="row"><span class="k">जारी दिनांक / Issued</span><span class="v">14/07/1998 — अनुविभागीय अधिकारी (राजस्व)</span></div>
  <div class="wm">SPECIMEN · DEMO</div>
</div>"""


PERSONAS = {
    "ramesh": dict(
        name="Ramesh Kumar Sahu", name_hi="रमेश कुमार साहू", father="Ghanshyam Sahu", father_hi="घनश्याम साहू",
        dob="12/03/1985", gender="Male", gender_hi="पुरुष", uid="XXXX XXXX 4821",
        address="S/O घनश्याम साहू, वार्ड नं. 5, ग्राम कुरूद, तहसील कुरूद, जिला धमतरी, छत्तीसगढ़ - 493663",
        village="Kurud", village_hi="कुरूद", tehsil="Kurud", district="Dhamtari", ration_no="CG-DMT-221-004187",
        card_type="प्राथमिकता (Priority)",
        family=[("रमेश कुमार साहू", "मुखिया", 41), ("गीता साहू", "पत्नी", 37), ("अंकित साहू", "पुत्र", 15), ("पूजा साहू", "पुत्री", 12)],
    ),
    "priya": dict(
        name="Priya Verma", name_hi="प्रिया वर्मा", father="Suresh Verma", father_hi="सुरेश वर्मा",
        grandfather_hi="रामलाल वर्मा", dob="21/08/2005", gender="Female", gender_hi="महिला", uid="XXXX XXXX 7310",
        address="D/O सुरेश वर्मा, म.नं. 42, सेक्टर 3, शंकर नगर, रायपुर, छत्तीसगढ़ - 492007",
        village="Shankar Nagar", village_hi="शंकर नगर", tehsil="Raipur", district="Raipur",
        caste="Satnami", caste_hi="सतनामी", school="Govt. Higher Secondary School, Shankar Nagar, Raipur", roll="2104417",
    ),
    "sunita": dict(
        # Aadhaar still carries her maiden surname -> AI should flag the mismatch
        name="Sunita Markam", name_hi="सुनीता मरकाम", father="Budhram Markam", father_hi="बुधराम मरकाम",
        dob="15/06/1990", gender="Female", gender_hi="महिला", uid="XXXX XXXX 5596",
        address="D/O बुधराम मरकाम, ग्राम सिहावा, तहसील नगरी, जिला धमतरी, छत्तीसगढ़ - 493778",
    ),
    "sunita_ration": dict(
        name="Sunita Dhruw", name_hi="सुनीता ध्रुव", father="Rajesh Dhruw", father_hi="राजेश ध्रुव (पति)",
        village="Sihawa", village_hi="सिहावा", tehsil="Nagri", district="Dhamtari", ration_no="CG-DMT-307-011902",
        card_type="अंत्योदय (Antyodaya)",
        family=[("सुनीता ध्रुव", "मुखिया", 36), ("राजेश ध्रुव", "पति", 39), ("कविता ध्रुव", "पुत्री", 10)],
    ),
}

DOCS = [
    ("ramesh_aadhaar", aadhaar, "ramesh"),
    ("ramesh_ration_card", ration, "ramesh"),
    ("ramesh_b1_land_record", b1, "ramesh"),
    ("priya_aadhaar", aadhaar, "priya"),
    ("priya_father_caste_certificate", caste, "priya"),
    ("priya_school_certificate", school, "priya"),
    ("sunita_aadhaar", aadhaar, "sunita"),
    ("sunita_ration_card", ration, "sunita_ration"),
]


def render(name, fn, persona):
    w, h, body = fn(PERSONAS[persona])
    html = "<html><head><meta charset='utf-8'>" + BASE_CSS.replace("WIDTH", str(w)).replace("HEIGHT", str(h)) + "</head><body>" + body + "</body></html>"
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "doc.html")
        png = os.path.join(tmp, "doc.png")
        open(src, "w", encoding="utf-8").write(html)
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--screenshot={png}",
             f"--window-size={w},{h}", "file://" + src],
            check=True, capture_output=True,
        )
        img = Image.open(png).convert("RGB")
    return phone_photo(img)


def phone_photo(img, seed=7):
    """Make a clean render look like a phone photo on a table: margin, slight tilt, warm light."""
    random.seed(seed)
    w, h = img.size
    bg = Image.new("RGB", (w + 120, h + 120), (118, 96, 74))
    bg.paste(img, (60, 60))
    bg = bg.rotate(random.uniform(-2.2, 2.2), resample=Image.BICUBIC, fillcolor=(118, 96, 74))
    bg = ImageEnhance.Brightness(bg).enhance(0.97)
    bg = ImageEnhance.Color(bg).enhance(1.05)
    return bg.filter(ImageFilter.GaussianBlur(0.4))


if __name__ == "__main__":
    for name, fn, persona in DOCS:
        img = render(name, fn, persona)
        img.save(os.path.join(OUT, f"{name}.jpg"), quality=86)
        print("wrote", name)
    # A deliberately unusable photo for the quality-check demo
    blurry = Image.open(os.path.join(OUT, "ramesh_ration_card.jpg")).filter(ImageFilter.GaussianBlur(7))
    blurry = ImageEnhance.Brightness(blurry).enhance(0.55)
    blurry.save(os.path.join(OUT, "ramesh_ration_card_blurry.jpg"), quality=80)
    print("wrote blurry copy")
