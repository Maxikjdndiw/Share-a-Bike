#!/usr/bin/env python3
"""Build site/de.html from site/index.html.

Run from the repo root:  python3 tools/build-de.py
Edit index.html first, then rerun this. The script prints every visible
English text node it could not translate, so nothing slips through.

Strings marked LEGAL in the comments below need a review by the founders
or a parent before launch.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "index.html"
OUT = ROOT / "site" / "de.html"

# 1) Raw HTML replacements for sentences that span several tags,
#    plus head, language and link changes. Applied first, in order.
RAW = [
    ('<html lang="en"', '<html lang="de"'),
    ('content="https://shareabike.netlify.app/"', 'content="https://shareabike.netlify.app/de.html"'),
    ('content="en_GB"', 'content="de_DE"'),
    ('<a class="lang-toggle" href="de.html" hreflang="de" lang="de" aria-label="Deutsche Version">DE</a>',
     '<a class="lang-toggle" href="index.html" hreflang="en" lang="en" aria-label="English version">EN</a>'),
    ('<a class="mobile-menu__lang" href="de.html" hreflang="de" lang="de">Deutsch</a>',
     '<a class="mobile-menu__lang" href="index.html" hreflang="en" lang="en">English</a>'),
    ('<a href="de.html" hreflang="de" lang="de">Deutsch</a>',
     '<a href="index.html" hreflang="en" lang="en">English</a>'),
    # LEGAL: privacy confirmation
    ('<span>I have read the <a href="datenschutz.html" target="_blank" rel="noopener">privacy notice</a>.</span>',
     '<span>Ich habe die <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen.</span>'),
    ('<p>We sent a confirmation link to <b data-thanks-email>your inbox</b>. Click it to secure your spot and your 2 free reservations.</p>',
     '<p>Wir haben einen Bestätigungslink an <b data-thanks-email>dein Postfach</b> geschickt. Klick darauf, um dir deinen Platz und deine 2 Gratis-Reservierungen zu sichern.</p>'),
    ('Return by <b>13:11</b><br>to School Station', 'Zurück bis <b>13:11</b><br>an der Schulstation'),
    ('<b>9 min</b> at Paasch', '<b>9 Min.</b> bei Paasch'),
    ('<b>35 min</b> at Paasch', '<b>35 Min.</b> bei Paasch'),
    ('Your bike gets <span class="todo">[TODO: confirm, for example a free service when the pilot ends]</span>.',
     'Dein Rad bekommt <span class="todo">[TODO: bestätigen, zum Beispiel eine kostenlose Inspektion am Ende des Piloten]</span>.'),
]

# 2) Whole text nodes and attribute values (matched after trimming).
T = {
    # head
    "Share a Bike · Bike sharing at Schule Louisenlund": "Share a Bike · Bikesharing an der Schule Louisenlund",
    "Peer-to-peer bike sharing for students at Schule Louisenlund. Borrow a bike from the school station in seconds. Join the waitlist for the pilot in January 2027.":
        "Bikesharing von Schülern für Schüler an der Schule Louisenlund. Leih dir in Sekunden ein Rad an der Schulstation. Trag dich auf die Warteliste für den Piloten im Januar 2027 ein.",
    "Borrow a bike from school in seconds. Back before the bell. Join the waitlist: early sign ups get 2 free reservations.":
        "Leih dir in Sekunden ein Rad an der Schule. Zurück vor dem Klingeln. Trag dich ein: Wer früh dabei ist, bekommt 2 Gratis-Reservierungen.",
    "Share a Bike: Just ride. A student bike sharing pilot at Schule Louisenlund.":
        "Share a Bike: Einfach losfahren. Ein Bikesharing-Pilot von Schülern an der Schule Louisenlund.",
    # header and nav
    "Skip to content": "Zum Inhalt springen",
    "Share a Bike home": "Share a Bike Startseite",
    "Main": "Hauptmenü",
    "How it works": "So geht's",
    "Book a bike": "Rad buchen",
    "Reserve a free bike in two taps": "Freies Rad mit zwei Tipps reservieren",
    "Unlock at the station": "An der Station entsperren",
    "The smart lock opens from your phone": "Das Smart Lock öffnet sich per Handy",
    "Ride to EDEKA Paasch": "Zu EDEKA Paasch fahren",
    "1.5 km, about 5 minutes": "1,5 km, etwa 5 Minuten",
    "Return on time": "Pünktlich zurückbringen",
    "About 30 minutes at lunch": "Etwa 30 Minuten in der Mittagspause",
    "Lunch break planner": "Mittagspausen-Planer",
    "See how much time you win": "Sieh, wie viel Zeit du gewinnst",
    "Pricing": "Preise",
    "Pay per ride · 0 € / month": "Pay per Ride · 0 € / Monat",
    "From 2 € per ride, pay with credit": "Ab 2 € pro Fahrt, bezahlt mit Guthaben",
    "Basic · 5 € / month": "Basic · 5 € / Monat",
    "Rides from 1 €": "Fahrten ab 1 €",
    "Premium · 12 € / month": "Premium · 12 € / Monat",
    "4 free reservations a month and perks": "4 Gratis-Reservierungen im Monat und Vorteile",
    "Top-up credit": "Guthaben aufladen",
    "Up to 5 € extra credit": "Bis zu 5 € extra Guthaben",
    "Which plan is cheapest?": "Welcher Tarif ist am günstigsten?",
    "Compare by rides per month": "Vergleich nach Fahrten pro Monat",
    "For owners": "Für Besitzer",
    "Benefits": "Vorteile",
    "Free Premium, worth 12 € a month": "Premium gratis, im Wert von 12 € im Monat",
    "Requirements": "Voraussetzungen",
    "A safe, roadworthy bike with lights": "Ein sicheres, verkehrstaugliches Rad mit Licht",
    "Safety and rules": "Sicherheit und Regeln",
    "GPS, weekly checks, helmets": "GPS, wöchentliche Checks, Helme",
    "Lend your bike": "Verleih dein Rad",
    "Join the waitlist as an owner": "Als Besitzer auf die Warteliste",
    "For parents": "Für Eltern",
    "Join the waitlist": "Auf die Warteliste",
    "Join": "Eintragen",
    "Open menu": "Menü öffnen",
    "Mobile": "Mobilmenü",
    "FAQ": "FAQ",
    # hero
    "Early sign ups get 2 free reservations": "Wer früh dabei ist, bekommt 2 Gratis-Reservierungen",
    "Just ride.": "Einfach losfahren.",
    "Student bike sharing at Schule Louisenlund. Borrow a bike in seconds, back before the bell.":
        "Bikesharing für Schüler an der Schule Louisenlund. In Sekunden ein Rad leihen, zurück vor dem Klingeln.",
    "I want to ride": "Ich will fahren",
    "I want to lend my bike": "Ich will mein Rad verleihen",
    "Pilot launch January 2027": "Pilotstart Januar 2027",
    "School Station": "Schulstation",
    "To EDEKA Paasch": "Zu EDEKA Paasch",
    "1.5 km · about 5 min": "1,5 km · etwa 5 Min.",
    "4 bikes free at the station": "4 Räder frei an der Station",
    "Now": "Jetzt",
    "City bike #07": "Stadtrad #07",
    "3 gears · lights · basket": "3 Gänge · Licht · Korb",
    "Free": "Frei",
    "Trekking #03": "Trekking #03",
    "7 gears · lights": "7 Gänge · Licht",
    "City bike #11": "Stadtrad #11",
    "Back at 13:05": "Zurück um 13:05",
    "In use": "Unterwegs",
    "Book for 30 min": "Für 30 Min. buchen",
    "Ride in progress": "Fahrt läuft",
    "left": "übrig",
    "End ride": "Fahrt beenden",
    # ticker
    "Why you can trust Share a Bike": "Warum du Share a Bike vertrauen kannst",
    "GPS tracked": "Per GPS geortet",
    "Checked every week": "Jede Woche geprüft",
    "Helmet required": "Helmpflicht",
    "No password, sign up in seconds": "Kein Passwort, in Sekunden angemeldet",
    "Data deleted after 30 days": "Daten nach 30 Tagen gelöscht",
    "Run by students": "Von Schülern betrieben",
    # problem and planner
    "Your lunch break is too short to walk.": "Deine Mittagspause ist zu kurz zum Laufen.",
    "Walking 1.5 km to EDEKA Paasch eats up the whole break. Meanwhile, most bikes on campus stand unused all day.":
        "1,5 km zu Fuß zu EDEKA Paasch fressen die ganze Pause. Dabei stehen die meisten Räder auf dem Campus den ganzen Tag ungenutzt herum.",
    "km": "km",
    "to EDEKA Paasch.": "bis EDEKA Paasch.",
    "About 5 minutes by bike.": "Etwa 5 Minuten mit dem Rad.",
    "Your lunch break": "Deine Mittagspause",
    "min": "Min.",
    "On foot": "Zu Fuß",
    "By bike": "Mit dem Rad",
    "Dark is the way there and back. Mint is your time at Paasch, red is how late you would be.":
        "Dunkel ist der Hin- und Rückweg. Mint ist deine Zeit bei Paasch, Rot zeigt, wie spät du dran wärst.",
    # how it works
    "Four steps. Zero hassle.": "Vier Schritte. Null Stress.",
    "Everything happens in the app. One station, right at school.": "Alles läuft über die App. Eine Station, direkt an der Schule.",
    "Book a free bike in the app.": "Buch ein freies Rad in der App.",
    "See which bikes are free right now and reserve one in two taps.": "Sieh, welche Räder gerade frei sind, und reservier eins mit zwei Tipps.",
    "4 bikes free": "4 Räder frei",
    "3 gears · lights": "3 Gänge · Licht",
    "Book now": "Jetzt buchen",
    "Unlock it at the school station.": "Entsperr es an der Schulstation.",
    "Walk up to your bike. The smart lock opens from your phone.": "Geh zu deinem Rad. Das Smart Lock öffnet sich per Handy.",
    "City bike #07 · Slot 3": "Stadtrad #07 · Platz 3",
    "Hold to unlock": "Halten zum Entsperren",
    "Helmet on? Have a good ride.": "Helm auf? Gute Fahrt.",
    "Ride to EDEKA Paasch or wherever you need.": "Fahr zu EDEKA Paasch oder wohin du willst.",
    "Groceries, the station, a friend in town. Just keep an eye on the clock.": "Einkaufen, zum Bahnhof, zu Freunden in der Stadt. Behalte nur die Uhr im Blick.",
    "Paasch · 3 min": "Paasch · 3 Min.",
    "Return it to the station on time.": "Bring es pünktlich zur Station zurück.",
    "At lunch, rides are about 30 minutes so you're back for class. Otherwise your plan sets the limit. Lock it, done.":
        "In der Mittagspause dauern Fahrten etwa 30 Minuten, damit du rechtzeitig zum Unterricht zurück bist. Sonst gibt dein Tarif das Limit vor. Abschließen, fertig.",
    "Ride finished": "Fahrt beendet",
    "Back on time": "Pünktlich zurück",
    "24 min · City bike #07": "24 Min. · Stadtrad #07",
    "Returned to School Station": "Zurück an der Schulstation",
    # pricing
    "Simple prices. No surprises.": "Einfache Preise. Keine Überraschungen.",
    "Pick the plan that fits how often you ride. Early sign ups get 2 free reservations.":
        "Wähl den Tarif, der zu deinen Fahrten passt. Wer früh dabei ist, bekommt 2 Gratis-Reservierungen.",
    "Pay per ride": "Pay per Ride",
    "/ month": "/ Monat",
    "No subscription. Pay with top-up credit.": "Kein Abo. Bezahlt wird mit aufgeladenem Guthaben.",
    "First 30 min": "Erste 30 Min.",
    "Second 30 min": "Zweite 30 Min.",
    "Third 30 min": "Dritte 30 Min.",
    "Reservation": "Reservierung",
    "[TODO: confirm price]": "[TODO: Preis bestätigen]",
    "pilot price": "Pilotpreis",
    "Total price by ride length": "Gesamtpreis nach Fahrtdauer",
    "Pay per ride totals: 30 minutes 2 euros, 1 hour 5 euros, 1.5 hours 9 euros.":
        "Pay per Ride gesamt: 30 Minuten 2 Euro, 1 Stunde 5 Euro, 1,5 Stunden 9 Euro.",
    "30 min: 2 €": "30 Min.: 2 €",
    "1 h: 5 €": "1 Std.: 5 €",
    "1.5 h: 9 €": "1,5 Std.: 9 €",
    "30 min": "30 Min.",
    "1 h": "1 Std.",
    "1.5 h": "1,5 Std.",
    "A small monthly fee for cheaper rides.": "Eine kleine Monatsgebühr für günstigere Fahrten.",
    "0.50 € each": "je 0,50 €",
    "Pay at the end of the month, with a friendly reminder": "Bezahlt wird am Monatsende, mit freundlicher Erinnerung",
    "Best for regular riders": "Ideal für Vielfahrer",
    "Free reservations and partner perks.": "Gratis-Reservierungen und Partnervorteile.",
    "Reservations": "Reservierungen",
    "4 free per month": "4 gratis pro Monat",
    "More reservations": "Weitere Reservierungen",
    "At a discount": "Vergünstigt",
    # EDEKA perks wording: translated only, meaning unchanged
    "Partner perks, for example credit at EDEKA Paasch": "Partnervorteile, zum Beispiel Guthaben bei EDEKA Paasch",
    "Rides up to 45 min": "Fahrten bis 45 Min.",
    "Included": "Inklusive",
    "Over 45 min": "Über 45 Min.",
    "Lunch rides are about 30 minutes, whatever your plan.": "Fahrten in der Mittagspause dauern etwa 30 Minuten, egal mit welchem Tarif.",
    "Top up, get more": "Mehr aufladen, mehr bekommen",
    "Pay per ride works with credit. The more you top up, the more you get.": "Pay per Ride läuft mit Guthaben. Je mehr du auflädst, desto mehr bekommst du.",
    "5 € credit": "5 € Guthaben",
    "Minimum top-up": "Mindestbetrag",
    "11 € credit": "11 € Guthaben",
    "1 € extra": "1 € extra",
    "23 € credit": "23 € Guthaben",
    "3 € extra": "3 € extra",
    "Best deal": "Bester Deal",
    "35 € credit": "35 € Guthaben",
    "5 € extra and 1 free reservation": "5 € extra und 1 Gratis-Reservierung",
    "Credit and bonus never expire. Credit is only for rides and can't be paid out.":
        "Guthaben und Bonus verfallen nie. Guthaben gilt nur für Fahrten und wird nicht ausgezahlt.",
    "Pay per ride is cheapest up to about 5 rides a month, Basic fits 5 to 7 rides, and Premium is cheapest from about 7 to 8 rides.":
        "Pay per Ride ist bis etwa 5 Fahrten im Monat am günstigsten, Basic passt für 5 bis 7 Fahrten und Premium lohnt sich ab etwa 7 bis 8 Fahrten.",
    "Rides per month": "Fahrten pro Monat",
    "Cheapest:": "Am günstigsten:",
    "Monthly cost for rides under 30 minutes": "Monatliche Kosten für Fahrten unter 30 Minuten",
    "Rides a month": "Fahrten im Monat",
    "Reservation fees are not included.": "Reservierungsgebühren sind nicht enthalten.",
    "How a ride is counted": "So wird eine Fahrt gezählt",
    "A ride counts from taking the bike at the station until you return it. Stops in between don't matter. With pay per ride, each further 30 minutes costs about 1 € more than the one before.":
        "Eine Fahrt zählt vom Abholen an der Station bis zur Rückgabe. Stopps dazwischen spielen keine Rolle. Bei Pay per Ride kostet jede weitere halbe Stunde etwa 1 € mehr als die davor.",
    "Reservations with Basic": "Reservierungen mit Basic",
    "Book up to 30 minutes ahead. A reservation expires 5 minutes after the booked time, and a no-show still pays the 0.50 € fee. Walk-up rides without a reservation cost nothing extra.":
        "Buch bis zu 30 Minuten im Voraus. Eine Reservierung verfällt 5 Minuten nach der gebuchten Zeit, und wer nicht kommt, zahlt trotzdem die Gebühr von 0,50 €. Spontane Fahrten ohne Reservierung kosten nichts extra.",
    "During lunch break every ride is about 30 minutes, whatever your plan, so the next student gets a bike and everyone is back for class.":
        "In der Mittagspause dauert jede Fahrt etwa 30 Minuten, egal mit welchem Tarif. So bekommt der Nächste ein Rad und alle sind rechtzeitig zurück im Unterricht.",
    # owners
    "Your bike stands still. Let it work.": "Dein Rad steht still. Lass es arbeiten.",
    "Lend it to Share a Bike and ride Premium for free. You stay in control.": "Verleih es an Share a Bike und fahr Premium gratis. Du behältst die Kontrolle.",
    "Free Premium": "Premium gratis",
    "worth 12 € a month": "im Wert von 12 € im Monat",
    "Your bike stays on campus": "Dein Rad bleibt auf dem Campus",
    "You choose when it is available": "Du entscheidest, wann es verfügbar ist",
    "You can always book your own bike first": "Du kannst dein eigenes Rad immer zuerst buchen",
    "We fit a GPS tracker and smart lock for free": "Wir bauen kostenlos einen GPS-Tracker und ein Smart Lock ein",
    "Riders pay for any damage or loss, and we handle it": "Fahrer zahlen für Schäden oder Verlust, und wir kümmern uns darum",
    "You never deal with the rider directly": "Du hast nie direkt mit dem Fahrer zu tun",
    "Requirements:": "Voraussetzungen:",
    "a safe, roadworthy bike with working lights.": "ein sicheres, verkehrstaugliches Rad mit funktionierendem Licht.",
    "Lend my bike": "Mein Rad verleihen",
    "GPS tracker": "GPS-Tracker",
    "Smart lock": "Smart Lock",
    "A small tracker on the handlebar that we fit for free. It only records where your bike is during a ride, and that data is deleted after 30 days.":
        "Ein kleiner Tracker am Lenker, den wir kostenlos anbringen. Er zeichnet nur während einer Fahrt auf, wo dein Rad ist, und diese Daten werden nach 30 Tagen gelöscht.",
    "Opens from the rider's phone only for their booked ride and locks again at the school station. No keys to hand over, and you never have to meet the rider.":
        "Öffnet sich per Handy nur für die gebuchte Fahrt und schließt an der Schulstation wieder ab. Keine Schlüsselübergabe, und du musst den Fahrer nie treffen.",
    "Draft, not final": "Entwurf, nicht final",
    "More for owners": "Mehr für Besitzer",
    "Credit per ride": "Guthaben pro Fahrt",
    "Every ride on your bike earns you": "Für jede Fahrt mit deinem Rad bekommst du",
    "[TODO: amount]": "[TODO: Betrag]",
    "credit.": "Guthaben.",
    "Early owner bonus": "Bonus für frühe Besitzer",
    "The first 15 owners get": "Die ersten 15 Besitzer bekommen",
    "[TODO: bonus]": "[TODO: Bonus]",
    "End of pilot service": "Service zum Pilotende",
    "If your bike is damaged beyond repair:": "Wenn dein Rad nicht mehr zu reparieren ist:",
    "[TODO: confirm what the owner gets]": "[TODO: bestätigen, was der Besitzer bekommt]",
    # safety (weekly check and weather wording translated, promise unchanged)
    "Safe by default.": "Sicher von Anfang an.",
    "Clear rules for riders, peace of mind for parents and owners.": "Klare Regeln für Fahrer, ein gutes Gefühl für Eltern und Besitzer.",
    "No helmet, no ride. On every trip.": "Ohne Helm keine Fahrt. Bei jeder Tour.",
    "Brakes, lights and tyres, every single week.": "Bremsen, Licht und Reifen, jede einzelne Woche.",
    "GPS only during rides": "GPS nur während der Fahrt",
    "No tracking when a bike is parked.": "Keine Ortung, wenn ein Rad parkt.",
    "Deleted after 30 days": "Nach 30 Tagen gelöscht",
    "Location data is removed automatically.": "Standortdaten werden automatisch entfernt.",
    "Weather and ice warnings": "Wetter- und Glättewarnungen",
    "The app warns you before icy rides.": "Die App warnt dich vor glatten Strecken.",
    "Paused in school holidays": "Pause in den Ferien",
    "No rides while school is out.": "Keine Fahrten, solange Ferien sind.",
    # signup
    "Get on the list.": "Komm auf die Liste.",
    "Be first when we launch in January 2027. Early sign ups get 2 free reservations.":
        "Sei als Erstes dabei, wenn wir im Januar 2027 starten. Wer früh dabei ist, bekommt 2 Gratis-Reservierungen.",
    "50 riders. 15 bikes.": "50 Fahrer. 15 Räder.",
    "That's what we need to start the pilot in January 2027. Be one of them.":
        "So viele brauchen wir, um den Piloten im Januar 2027 zu starten. Sei dabei.",
    "confirmed sign-ups so far": "bestätigte Anmeldungen bisher",
    "Riders": "Fahrer",
    "Bike owners": "Radbesitzer",
    "Name": "Name",
    "Your first name": "Dein Vorname",
    "Email": "E-Mail",
    "name@example.com": "name@example.com",
    "We only use it for the waitlist.": "Wir nutzen sie nur für die Warteliste.",
    "Year group": "Jahrgang",
    "Choose your year": "Wähl deinen Jahrgang",
    "Year 5": "Klasse 5", "Year 6": "Klasse 6", "Year 7": "Klasse 7", "Year 8": "Klasse 8",
    "Year 9": "Klasse 9", "Year 10": "Klasse 10", "Year 11": "Klasse 11", "Year 12": "Klasse 12",
    "Year 13": "Klasse 13",
    "Other": "Andere",
    "I want to": "Ich will",
    "Ride": "Fahren",
    "Both": "Beides",
    "Bike type": "Fahrradtyp",
    "Choose your bike": "Wähl dein Rad",
    "City bike": "Stadtrad",
    "Trekking bike": "Trekkingrad",
    "Mountain bike": "Mountainbike",
    "Road bike": "Rennrad",
    # LEGAL: parent email and consent wording
    "Parent's email": "E-Mail eines Elternteils",
    "optional, for riders under 18": "optional, für Fahrer unter 18",
    "parent@example.com": "eltern@example.com",
    "I am 18 or older. Or I am under 18 and a parent or guardian agrees to my sign-up and to paid rides and credit later.":
        "Ich bin 18 oder älter. Oder ich bin unter 18 und ein Elternteil oder Erziehungsberechtigter ist mit meiner Anmeldung und mit späteren kostenpflichtigen Fahrten und Guthaben einverstanden.",
    "Website": "Website",
    "No password. We'll send one email to confirm your address.": "Kein Passwort. Wir schicken dir eine E-Mail, um deine Adresse zu bestätigen.",
    "After you confirm your email, we'll write to you": "Nachdem du deine E-Mail bestätigt hast, melden wir uns",
    '[TODO: confirm timeline, for example "in December before the pilot starts"]':
        '[TODO: Zeitplan bestätigen, zum Beispiel "im Dezember vor dem Pilotstart"]',
    "You're almost in.": "Fast geschafft.",
    "Nothing there? Check your spam folder.": "Nichts angekommen? Schau in deinen Spam-Ordner.",
    "Wrong email? Change it": "Falsche E-Mail? Ändern",
    # parents (LEGAL: whole section)
    "For parents.": "Für Eltern.",
    "Straight answers about school, safety and money.": "Klare Antworten zu Schule, Sicherheit und Geld.",
    "Is the school involved?": "Ist die Schule beteiligt?",
    "[TODO: confirm school approval, or state that Share a Bike is an independent student project]":
        "[TODO: Zustimmung der Schule bestätigen oder angeben, dass Share a Bike unabhängig von der Schule ist]",
    "Who is liable if something happens?": "Wer haftet, wenn etwas passiert?",
    "Riders pay for damage or loss of a bike, and we handle it with them.": "Fahrer zahlen für Schäden oder Verlust eines Rads, und wir klären das mit ihnen.",
    "[TODO: confirm liability insurance for riders, and what covers a damaged or stolen bike beyond the rider paying]":
        "[TODO: Haftpflichtversicherung für Fahrer bestätigen und klären, was ein beschädigtes oder gestohlenes Rad absichert, falls der Fahrer nicht zahlt]",
    "Can students leave campus at lunch?": "Dürfen Schüler in der Mittagspause den Campus verlassen?",
    "[TODO: confirm with school rules]": "[TODO: mit der Schulordnung abgleichen]",
    "Where is the station, and how safe is the route?": "Wo ist die Station, und wie sicher ist der Weg?",
    "The station is at school, and EDEKA Paasch is 1.5 km away. Helmets are required on every ride.":
        "Die Station ist an der Schule, EDEKA Paasch ist 1,5 km entfernt. Bei jeder Fahrt gilt Helmpflicht.",
    "[TODO: confirm station location, cycle path and lighting in winter]":
        "[TODO: Standort der Station, Radweg und Beleuchtung im Winter bestätigen]",
    "My child is under 18. What do I need to know?": "Mein Kind ist unter 18. Was muss ich wissen?",
    "Riders under 18 need a parent's consent for paid rides and top-up credit. Your child can add your email when signing up.":
        "Fahrer unter 18 brauchen die Zustimmung der Eltern für kostenpflichtige Fahrten und Guthaben. Ihr Kind kann bei der Anmeldung Ihre E-Mail-Adresse angeben.",
    "[TODO: confirm how parental consent is collected]": "[TODO: bestätigen, wie die Zustimmung der Eltern eingeholt wird]",
    # FAQ
    "Good questions.": "Gute Fragen.",
    "Anything else? Write to us at mail.shareabike@gmail.com.": "Noch etwas? Schreib uns an mail.shareabike@gmail.com.",
    "When does it launch?": "Wann geht es los?",
    "The pilot starts in January 2027 at Schule Louisenlund. Everyone on the waitlist hears first.":
        "Der Pilot startet im Januar 2027 an der Schule Louisenlund. Alle auf der Warteliste erfahren es zuerst.",
    "What if a bike is broken?": "Was ist, wenn ein Rad kaputt ist?",
    "Report it in the app. We set the bike to maintenance right away and repair it before anyone rides it again.":
        "Melde es in der App. Wir setzen das Rad sofort auf Wartung und reparieren es, bevor jemand wieder damit fährt.",
    "Can I lend my bike only on certain days?": "Kann ich mein Rad nur an bestimmten Tagen verleihen?",
    "Yes. You set the days and times your bike is available, and you can change them at any time.":
        "Ja. Du legst fest, an welchen Tagen und zu welchen Zeiten dein Rad verfügbar ist, und kannst das jederzeit ändern.",
    "How do I pay?": "Wie bezahle ich?",
    "Pay per ride uses top-up credit. With Basic, rides are paid at the end of the month. Payments go through a payment provider by card or bank transfer, and we never store your card details ourselves.":
        "Pay per Ride läuft über aufgeladenes Guthaben. Mit Basic werden Fahrten am Monatsende bezahlt. Zahlungen laufen über einen Zahlungsanbieter per Karte oder Überweisung, und wir speichern deine Kartendaten nie selbst.",
    "Is my data safe?": "Sind meine Daten sicher?",
    "Location is only recorded during rides and deleted after 30 days. You only ever see your own data.":
        "Der Standort wird nur während der Fahrt aufgezeichnet und nach 30 Tagen gelöscht. Du siehst immer nur deine eigenen Daten.",
    "I'm a parent. Who is behind this?": "Ich bin ein Elternteil. Wer steckt dahinter?",
    "Share a Bike was founded by four students at Schule Louisenlund. A parent of one of the founders is legally responsible (see the":
        "Share a Bike wurde von vier Schülern der Schule Louisenlund gegründet. Ein Elternteil eines Gründers ist rechtlich verantwortlich (siehe",
    "Impressum": "Impressum",
    "). Questions are welcome at mail.shareabike@gmail.com.": "). Fragen gern an mail.shareabike@gmail.com.",
    "What if a bike is damaged or stolen?": "Was ist, wenn ein Rad beschädigt oder gestohlen wird?",
    "The rider who had the bike pays for any damage or loss, and we handle it with them, so the owner never has to. Every ride is GPS tracked, so we always know who had a bike and where.":
        "Wer das Rad hatte, zahlt für Schäden oder Verlust, und wir klären das mit ihm, damit der Besitzer es nie muss. Jede Fahrt wird per GPS erfasst, also wissen wir immer, wer ein Rad wo hatte.",
    "What if I return a bike late?": "Was ist, wenn ich ein Rad zu spät zurückbringe?",
    "Late returns lead to a booking block, so the next rider is not left waiting:":
        "Verspätete Rückgaben führen zu einer Buchungssperre, damit der nächste Fahrer nicht warten muss:",
    "[TODO: confirm block length per minutes late]": "[TODO: Dauer der Sperre je Minute Verspätung bestätigen]",
    # team (founder section: only the shared labels, names untouched)
    "Built by students, for students.": "Von Schülern, für Schüler.",
    "Four founders at Schule Louisenlund. We use the bikes ourselves.": "Vier Gründer an der Schule Louisenlund. Wir fahren die Räder selbst.",
    "Founder": "Gründer",
    "Co-founder": "Mitgründer",
    # footer and cookies
    "Pilot launch January 2027.": "Pilotstart Januar 2027.",
    "Footer": "Fußzeile",
    "Sign up as owner": "Als Besitzer anmelden",
    "Legal": "Rechtliches",
    "Contact": "Kontakt",
    "Schleswig-Holstein, Germany": "Schleswig-Holstein, Deutschland",
    "Bike sharing at Schule Louisenlund": "Bikesharing an der Schule Louisenlund",
    "· No tracking cookies. No analytics. ©": "· Keine Tracking-Cookies. Keine Analyse. ©",
    "Cookies": "Cookies",
    "No tracking cookies here.": "Hier gibt es keine Tracking-Cookies.",
    "We don't use analytics or advertising cookies.": "Wir nutzen keine Analyse- oder Werbe-Cookies.",
    "Cookie policy": "Cookie-Richtlinie",
    "Decline": "Ablehnen",
    "Accept": "Akzeptieren",
}

# Text that is the same in both languages (names, brands, numbers).
KEEP = {
    "Share a Bike", "Share", "a", "Bike", "EDEKA Paasch", "Basic", "Premium", "website", "1200", "630",
    "Maxi", "Andreas", "Valentin", "Konstantin", "Head of Sales", "Head of Tech", "M", "A", "V", "K",
    "Schule Louisenlund", "mail.shareabike@gmail.com", "Datenschutzerklärung", "Impressum", "FAQ",
    "Trekking #03", "km", "Name", "Website", "Cookies", "name@example.com", "1 € extra", "3 € extra",
}

KEEP |= {"summary_large_image", "Service", "Share&nbsp;a&nbsp;Bike", "English version"}
# text already German after the RAW step
for _a, _b in RAW:
    KEEP |= {x.strip() for x in re.split(r"<[^>]+>", _b) if x.strip()}

ATTRS = ("content", "aria-label", "placeholder", "alt", "title")


def tr(text, missing, where):
    core = text.strip()
    if not core or not re.search(r"[A-Za-z]", core):
        return text
    if core in T:
        return text.replace(core, T[core], 1)
    if core not in KEEP:
        missing.append((where, core))
    return text


def main():
    html = SRC.read_text(encoding="utf-8")
    for a, b in RAW:
        if a not in html:
            sys.exit("RAW pattern not found in index.html: " + a[:80])
        html = html.replace(a, b)

    missing = []

    def attr(m):
        name, q, val = m.group(1), m.group(2), m.group(3)
        if name == "content" and (val.startswith("http") or "," in val and "=" in val):
            return m.group(0)
        return f'{name}={q}{tr(val, missing, "@" + name)}{q}'

    def tag(t):
        if t.startswith("<!--") or t.startswith("<!"):
            return t
        if t.startswith("<meta") and not re.search(r'(name="description"|property="og:(title|description|image:alt|site_name)"|name="twitter:)', t):
            return t
        return re.sub(r'\b(%s)=(["\'])(.*?)\2' % "|".join(ATTRS), attr, t)

    # split into tags/comments and text
    parts = re.split(r"(<!--.*?-->|<[^>]+>)", html, flags=re.S)
    out, skip = [], False
    for p in parts:
        if p.startswith("<"):
            low = p.lower()
            if low.startswith(("<script", "<style")) and not low.endswith("/>"):
                skip = True
            elif low.startswith(("</script", "</style")):
                skip = False
            out.append(tag(p))
        else:
            out.append(p if skip else tr(p, missing, "text"))
    html = "".join(out)

    html = html.replace("<!-- LEGAL REVIEW", "<!-- LEGAL REVIEW (German wording too)", 1)
    OUT.write_text(html, encoding="utf-8")

    if missing:
        print("Untranslated strings:")
        for where, s in missing:
            print(f"  [{where}] {s}")
        sys.exit(1)
    print("Wrote", OUT.relative_to(ROOT), "with no untranslated strings.")


if __name__ == "__main__":
    main()
