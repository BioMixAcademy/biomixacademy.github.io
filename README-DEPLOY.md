# BioMix Academy — בנייה ופריסה ב־GitHub Pages

אתר סטטי לחלוטין. אין שלב build, אין backend, כל הנתיבים יחסיים (`./`) ולכן האתר עובד גם מתוך
תת־נתיב של repository.

כתובת הפרסום המוגדרת כרגע: `https://biomixacademy.github.io/`

## מה מעלים

התיקייה `BioMixAcademy-site/` היא גרסת הפרסום המלאה והמוכנה. העלו את **תוכן** התיקייה
לשורש ה־repository, לא את התיקייה עצמה.

```
index.html                    ← עמוד הכניסה
support.js                    ← ה־runtime שמריץ את העמוד
config.js                     ← כל הקישורים ופרטי הקשר
biomix-field.js               ← מנוע הרקע המונפש (נטען לפני הבא)
biomix-background-v2.js       ← רכיב הרקע <biomix-dna-bg>
assets/                       ← כל התמונות, הסמן ותמונת השיתוף
.nojekyll                     ← מונע עיבוד Jekyll (חובה)
```

`BioMix Academy.dc.html` בשורש הפרויקט הוא **קובץ המקור לעריכה** ואינו נדרש לאתר עצמו.

## שלבי פריסה

1. צרו repository ציבורי בשם `biomixacademy.github.io` (או שם אחר, ואז עדכנו את הכתובת — ראו למטה).
2. העלו את הקבצים לענף `main`, בשורש ה־repository.
3. `Settings → Pages → Build and deployment → Source: Deploy from a branch`,
   ענף `main`, תיקייה `/ (root)`, ואז `Save`.
4. לאחר דקה־שתיים האתר יעלה.

## אם שם ה־repository או הדומיין משתנה

יש לעדכן את הכתובת בשני מקומות:

1. `config.js` — השדה `site.canonical`.
2. תגיות ה־`<head>` ב־`index.html` — `canonical`, `og:url`, `og:image`, `og:image:secure_url`,
   `twitter:image` ו־JSON-LD.

חשוב: `og:image` חייב להישאר כתובת מלאה. וואטסאפ ופייסבוק לא קוראים נתיבים יחסיים.

## עריכה שוטפת

* **קישורים ופרטי קשר** — `config.js` בלבד. אין כתובות מפוזרות בקוד.
* **תוכן ועיצוב** — `BioMix Academy.dc.html`, ואחר כך יש להעביר את התוכן ל־`index.html`
  כשתגיות ה־`<head>` מועברות לתוך `<head>` האמיתי (זה מה שעושה תהליך הייצוא).

## הערות טכניות

* ה־runtime טוען React מ־unpkg.com — נדרש חיבור לאינטרנט, אין צורך בהתקנה.
* גופן Heebo נטען מ־Google Fonts עם fallback לגופני מערכת עבריים.
* אין cookies, אין analytics ואין trackers.
* העדפות הנגישות נשמרות ב־`localStorage` תחת `biomix-a11y-v1`. זה המפתח היחיד שהאתר כותב.
* הפתיח מוצג בכל טעינה ובכל רענון, ואינו נשמר בזיכרון הדפדפן.
* השאלון נשלח ל־Formspree בבקשת `POST` ברקע. אין באתר טופס שמאחסן מידע.
* התשלום מוצג בחלון מוטמע מדף הסליקה של Cardcom. אין באתר שדות אשראי ואין גישה
  לתוכן הפריים. אם Cardcom חוסמת הטמעה, החלון מציג הודעה ומפנה לעמוד המאובטח שלהם —
  במקרה כזה יש לבקש מתמיכת Cardcom לאשר iframe עבור הדומיין.
