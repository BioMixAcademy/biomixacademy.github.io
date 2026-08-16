/* BioMix Academy — קובץ הגדרות מרכזי
   כל הקישורים החיצוניים והנתונים העסקיים של האתר מוגדרים כאן בלבד.
   אין לשכפל כתובות בתוך קוד האתר. שינוי כאן משנה את כל האתר. */

(function () {
  /* מספר הוואטסאפ של יאיר — פורמט בינלאומי, ללא +, ללא אפס מוביל, ללא מקפים ורווחים */
  const whatsappNumber = "972548751484";
  const whatsappMessage = "שלום יאיר, הגעתי דרך אתר BioMix ואשמח לקבל פרטים נוספים ולהתייעץ לגבי התהליך.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  /* פנייה בנושא נגישות מגיעה עם הודעה פותחת משלה */
  const whatsappA11yMessage = "שלום יאיר, אני פונה בנושא נגישות באתר BioMix. נתקלתי בבעיה הבאה: ";
  const whatsappA11yUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappA11yMessage)}`;

  window.BIOMIX = {
    site: {
      brand: 'BioMix Academy',
      coach: 'יאיר שני',
      title: 'BioMix | שינוי הרכב הגוף לגברים 35+',
      description:
        'BioMix Academy – יאיר שני, מדריך כושר גופני ובריאות. אימונים קצרים וממוקדים, הנחיות תזונה פשוטות וליווי אישי לשינוי הרכב הגוף. אונליין ופרונטלי.',
      themeColor: '#03070D',
      /* כתובת הפרסום. אם ה־repository משנה שם או משתמש בדומיין אחר, עדכנו כאן
         וגם בתגיות ה־<head> ב־index.html (canonical, og:url, og:image, JSON-LD). */
      canonical: 'https://biomixacademy.github.io/',
      accessibilityUpdated: '16 באוגוסט 2026',
      phone: '054-875-1484',
      phoneHref: 'tel:+972548751484',
      formEndpoint: 'https://formspree.io/f/mljrnlbz',
      /* פניות מגיעות דרך הטופס באתר (Formspree) או בוואטסאפ. */
    },

    /* קישורי הפעולה — הכותרות והכתובות מוטמעות באתר בדיוק כפי שהן */
    links: {
      info: {
        title: 'מידע נוסף על שיטת BioMix',
        url: 'https://697d2965a5a62.site123.me/'
      },
      quiz: {
        title: 'מתחילים כאן – שאלון התאמה וייעוץ',
        url: 'https://forms.gle/ZxTgqYRpboy8AqkJ7'
      },
      whatsapp: {
        title: 'לתיאום שיחת אבחון בוואטסאפ',
        number: whatsappNumber,
        message: whatsappMessage,
        url: whatsappUrl
      },
      whatsappAccessibility: {
        title: 'דיווח על בעיית נגישות בוואטסאפ',
        message: whatsappA11yMessage,
        url: whatsappA11yUrl
      },
      newTrainee: {
        title: 'למתאמנים חדשים – שאלון פתיחת תהליך',
        /* כתובת ציבורית למילוי בלבד. אין לפרסם את כתובת ה־/edit שמופיעה ב־Linktree. */
        url: 'https://docs.google.com/forms/d/e/1FAIpQLScNs8ZjFHGAtD5wcQCmTeD21dUTWeeAYEt0YgcMUufiiS4rIw/viewform'
      },
      payment: {
        title: 'מעבר מאובטח לתשלום',
        url: 'https://secure.cardcom.solutions/EA/EA5/eS4cNB3tCUGYzXv7WwF7Jw/Order',
        note: 'התשלום מתבצע באתר סליקה חיצוני מאובטח.'
      },
      instagram: {
        title: 'אימונים, טיפים והשראה ב־Instagram',
        url: 'https://instagram.com/yair_shani_biomix'
      },
      facebook: {
        title: 'עדכונים וקהילת BioMix ב־Facebook',
        url: 'https://www.facebook.com/yair.shani.2025'
      }
    },

    /* הערות מקור בלבד — אינן בשימוש באתר. */
    sourceOnly: {
      whatsappApiFromLinktree: 'https://api.whatsapp.com/send?phone=9720548751484',
      whatsappQrFromLinktree: 'https://wa.me/qr/RB2Q4L3VCM7BF1'
    }
  };
})();
