import { businessWords } from "./business-words";
import { dailyWords } from "./daily-words";

const dailyOverrides: Record<string, string> = {
  "I need to figure out how this works.": "Ich muss herausfinden, wie das funktioniert.",
  "She made remarkable progress.": "Sie machte bemerkenswerte Fortschritte.",
  "Eventually, everything fell into place.": "Schliesslich fügte sich alles zusammen.",
  "Good morning! Did you sleep well?": "Guten Morgen! Hast du gut geschlafen?",
  "Hi Anna, how are you today?": "Hallo Anna, wie geht es dir heute?",
  "I'm fine, thank you. And you?": "Mir geht es gut, danke. Und dir?",
  "Could you help me, please? I can't find the station.": "Könntest du mir bitte helfen? Ich kann den Bahnhof nicht finden.",
  "Excuse me, where is the bathroom?": "Entschuldigung, wo ist die Toilette?",
  "I like this shirt. How much does this cost?": "Dieses Hemd gefällt mir. Wie viel kostet es?",
  "I would like a coffee, please, with a little milk.": "Ich hätte gerne einen Kaffee mit etwas Milch.",
  "Sorry, what time is it?": "Entschuldigung, wie spät ist es?",
  "I have to go now. See you later.": "Ich muss jetzt gehen. Bis später.",
  "Thank you for your help. Have a nice day!": "Danke für deine Hilfe. Schönen Tag noch!",
};

export const dailyExampleTranslations: readonly string[] = dailyWords.map(([, german, example]) =>
  dailyOverrides[example] ?? german
);

const businessTemplates: ReadonlyArray<(term: string) => string> = [
  (term) => `Während der Sitzung am Montag befasste sich das Team genauer mit «${term}».`,
  (term) => `Der Kunde bat vor Mittag um eine klare Aktualisierung zu «${term}».`,
  (term) => `Unser Manager möchte «${term}» prüfen, bevor er eine Entscheidung trifft.`,
  (term) => `Ein kurzer Bericht zu «${term}» wurde mit dem gesamten Team geteilt.`,
  (term) => `Wir haben «${term}» auf die Tagesordnung für den morgigen Workshop gesetzt.`,
  (term) => `Der Vorstand bat um weitere Informationen zu «${term}».`,
  (term) => `Bitte bereiten Sie für das Kundengespräch einige Notizen zu «${term}» vor.`,
  (term) => `Alle waren sich einig, dass «${term}» mehr Aufmerksamkeit verdient.`,
  (term) => `Das Team wird «${term}» nach der Quartalsprüfung erneut betrachten.`,
  (term) => `Eine kürzliche Änderung im Zusammenhang mit «${term}» beeinflusste unseren ursprünglichen Plan.`,
  (term) => `Das Projekt warf mehrere wichtige Fragen zu «${term}» auf.`,
  (term) => `Wir verglichen zwei mögliche Vorgehensweisen für «${term}».`,
  (term) => `Der neue Vorschlag widmet «${term}» besondere Aufmerksamkeit.`,
  (term) => `Unsere nächste Schulung wird einen Abschnitt zu «${term}» enthalten.`,
  (term) => `Bis Freitag brauchen wir eine praktische Lösung für «${term}».`,
];

export const businessExampleTranslations: readonly string[] = businessWords.map(([, , german], index) =>
  businessTemplates[index % businessTemplates.length](german)
);
