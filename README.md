# BioMix Academy — אתר לפרסום ב־GitHub Pages

אתר סטטי. אין שלב build, אין backend, כל הנתיבים יחסיים — עובד גם מתת־נתיב של repository.

## מה יש בתיקייה

    index.html                 עמוד האתר
    config.js                  כל הקישורים ופרטי הקשר
    support.js                 מנוע הרינדור
    biomix-background-v2.js    הרקע המונפש
    biomix-field.js            שכבת החלקיקים
    .nojekyll                  מבטל עיבוד Jekyll (חובה)
    assets/                    לוגו, אייקונים, רקעים, סמן העכבר

## פריסה

1. העלו את תוכן התיקייה לשורש ה־repository בענף `main`.
2. Settings ← Pages ← Deploy from a branch ← `main` ← `/ (root)` ← Save.
3. תוך דקה־שתיים האתר עולה.

## עדכון קישורים

הכול ב־`config.js` בלבד. מספר הוואטסאפ, ההודעה הפותחת, כתובות הטפסים והתשלום.

## אם הכתובת הסופית שונה מ־https://biomixacademy.github.io/

חפשו והחליפו את הכתובת ב־`index.html` — היא מופיעה ב־canonical, ב־og:url, ב־og:image וב־JSON-LD.
