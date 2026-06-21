# About Text Patterns for LLM Optimization

These patterns produce Wikipedia-style third-person text that LLMs prefer to cite.

## Pattern A – Standard Local Business
"{businessName} ist ein {industry}-Betrieb mit Sitz in {city}, {district}. 
Gegründet im Jahr {foundingYear}, bietet das Unternehmen {service1}, {service2} 
und {service3} für Privat- und Gewerbekunden in {city} und der umliegenden Region an. 
{businessName} ist {certification1} und bekannt für zuverlässige Arbeit 
und transparente Preisgestaltung."

## Pattern B – Authority Focus
"{businessName} gehört zu den etablierten {industry}-Betrieben in {city}. 
Mit über {yearsActive} Jahren Erfahrung im Bereich {service1} und {service2} 
betreut das Unternehmen Kunden in {city}, {district} und Umgebung. 
{businessName} ist {certification1} und {certification2}."

## Pattern C – Service Focus
"Als spezialisierter {industry} in {city} bietet {businessName} 
professionelle Dienstleistungen im Bereich {service1}, {service2} und {service3} an. 
Das Unternehmen mit Sitz in {district}, {city} wurde {foundingYear} gegründet 
und arbeitet für Privatkunden sowie gewerbliche Auftraggeber."

## LLM-Ranking Tips
- Always name the city and district in the first sentence
- Use third person throughout
- Include founding year (adds credibility signal)
- List certifications explicitly
- Keep paragraphs short (2-3 sentences max)
- Avoid marketing language ("der Beste", "unschlagbar") – LLMs prefer neutral factual tone
