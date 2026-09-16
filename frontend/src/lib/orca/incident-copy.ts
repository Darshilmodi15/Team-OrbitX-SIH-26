const en = {
  incident: "Incident location", selected: "Confirmed saved location", gps: "Device GPS", manual: "User-entered location", unspecified: "Location source not recorded",
  confirmLocation: "Confirm this is the incident location before sending.", useGps: "Use device GPS instead",
  description: "Describe the emergency (optional)", noDescription: "No description provided",
  contact: "Suggested rescue contact", noDispatch: "Recorded in ORCA. No electronic dispatch to a rescue authority.",
  locationChanged: "Your saved location changed. Close this dialog and reload the location before sending.",
  failed: "SOS could not be saved. Try again or call 112 / 1554.", transcript: "Radio message", nature: "Emergency type",
};
const gu: typeof en = {
  incident:"ઘટનાનું સ્થાન", selected:"પુષ્ટિ કરેલું સાચવેલું સ્થાન", gps:"ઉપકરણનું GPS", manual:"વપરાશકર્તાએ દાખલ કરેલું સ્થાન", unspecified:"સ્થાનનો સ્રોત નોંધાયેલ નથી",
  confirmLocation:"મોકલતાં પહેલાં ખાતરી કરો કે આ ઘટનાનું સ્થાન છે.", useGps:"તેના બદલે ઉપકરણનું GPS વાપરો",
  description:"કટોકટીનું વર્ણન (વૈકલ્પિક)", noDescription:"વર્ણન આપેલું નથી", contact:"સૂચવેલો બચાવ સંપર્ક", noDispatch:"ORCA માં નોંધાયેલ. બચાવ અધિકારીને ઇલેક્ટ્રોનિક રીતે મોકલાયેલ નથી.",
  locationChanged:"સાચવેલું સ્થાન બદલાયું છે. આ વિન્ડો બંધ કરીને સ્થાન ફરી લોડ કરો.", failed:"SOS સાચવી શકાયું નથી. ફરી પ્રયાસ કરો અથવા 112 / 1554 પર ફોન કરો.", transcript:"રેડિયો સંદેશ", nature:"કટોકટીનો પ્રકાર",
};
const hi: typeof en = {
  incident:"घटना का स्थान", selected:"पुष्टि किया हुआ सहेजा स्थान", gps:"डिवाइस GPS", manual:"उपयोगकर्ता द्वारा दर्ज स्थान", unspecified:"स्थान का स्रोत दर्ज नहीं है",
  confirmLocation:"भेजने से पहले पुष्टि करें कि यह घटना का स्थान है।", useGps:"इसके बजाय डिवाइस GPS उपयोग करें",
  description:"आपात स्थिति का विवरण (वैकल्पिक)", noDescription:"विवरण नहीं दिया गया", contact:"सुझाया गया बचाव संपर्क", noDispatch:"ORCA में दर्ज। बचाव प्राधिकरण को इलेक्ट्रॉनिक रूप से नहीं भेजा गया।",
  locationChanged:"सहेजा स्थान बदल गया है। यह विंडो बंद करके स्थान फिर लोड करें।", failed:"SOS सहेजा नहीं जा सका। फिर कोशिश करें या 112 / 1554 पर कॉल करें।", transcript:"रेडियो संदेश", nature:"आपात स्थिति का प्रकार",
};
export function incidentCopy(lang: string) { return lang === "gu" ? gu : lang === "hi" ? hi : en; }
