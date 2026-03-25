
import React from 'react';
import { TranslationMap } from './types';
import { Shield, Map as MapIcon, AlertTriangle, FileText, BarChart3, Users, Mic } from 'lucide-react';

export const TRANSLATIONS: TranslationMap = {
  app_title: {
    Oromo: "Smart Police Agent",
    Amharic: "Smart Police Agent",
    English: "Smart Police Agent"
  },
  home: { Oromo: "Mana", Amharic: "መነሻ", English: "Home" },
  report_incident: { Oromo: "Gabaasa Dhimmaa", Amharic: "ክስተት ሪፖርት አድርግ", English: "Report Incident" },
  safety_alerts: { Oromo: "Akeekkachiisa Nageenyaa", Amharic: "የደህንነት ማስጠንቀቂያዎች", English: "Safety Alerts" },
  officer_dashboard: { Oromo: "Dabaree Poolisii", Amharic: "የፖሊስ ዳሽቦርድ", English: "Officer Dashboard" },
  admin_dashboard: { Oromo: "Dabaree Admin", Amharic: "የአስተዳዳሪ ዳሽቦርድ", English: "Admin Dashboard" },
  submit: { Oromo: "Ergi", Amharic: "አስገባ", English: "Submit" },
  upload_evidence: { Oromo: "Ragaa Ol-furi", Amharic: "ማስረጃ ይጫኑ", English: "Upload Evidence" },
  incident_summary: { Oromo: "Cuunfaa Gabaasaa", Amharic: "የክስተት ማጠቃለያ", English: "Incident Summary" },
  predicted_resources: { Oromo: "Qabeenya Tilmaamaa", Amharic: "የተተነበዩ ሀብቶች", English: "Predicted Resources" },
  hotspot_map: { Oromo: "Kaartaa Iddoo Balaa", Amharic: "የአደጋ ቀጠና ካርታ", English: "Hotspot Map" },
  voice_report: { Oromo: "Gabaasa Sagalee", Amharic: "የድምጽ ሪፖርት", English: "Voice Report" },
  kpi_overview: { Oromo: "Ilaalcha KPI", Amharic: "የKPI አጠቃላይ እይታ", English: "KPI Overview" },
  validation: { Oromo: "Mirkaneessuu", Amharic: "ማረጋገጫ", English: "Validation" },
  resource_planning: { Oromo: "Karoora Qabeenyaa", Amharic: "የሀብት እቅድ", English: "Resource Planning" },
  live_map: { Oromo: "Kaartaa Kallattii", Amharic: "የቀጥታ ካርታ", English: "Live Map" },
  full_name: { Oromo: "Maqaa Guutuu", Amharic: "ሙሉ ስም", English: "Full Name" },
  phone_number: { Oromo: "Lakkoofsa Bilbilaa", Amharic: "ስልክ ቁጥር", English: "Phone Number" },
  fayda_fin: { Oromo: "Lakkoofsa Fayda Fin", Amharic: "ፋይዳ ፊን ቁጥር", English: "Fayda Fin Number" },
};

export const COLORS = {
  primary: "#2A3F54",
  secondary: "#1ABC9C",
  accent: "#3498DB",
  background_light: "#F7F9FC",
  background_dark: "#E5EAF2",
  neutral_text: "#2C3E50",
  status_red: "#E74C3C",
  status_yellow: "#F1C40F",
  status_green: "#27AE60",
};

export const MENU_ITEMS = [
  { id: 'home', icon: <Shield size={20} />, label: 'home' },
  { id: 'report', icon: <FileText size={20} />, label: 'report_incident' },
  { id: 'alerts', icon: <AlertTriangle size={20} />, label: 'safety_alerts' },
];

export const OFFICER_MENU = [
  { id: 'hotspots', icon: <MapIcon size={20} />, label: 'hotspot_map' },
  { id: 'report', icon: <FileText size={20} />, label: 'report_incident' },
  { id: 'voice', icon: <Mic size={20} />, label: 'voice_report' },
];

export const ADMIN_MENU = [
  { id: 'admin_panel', icon: <Shield size={20} />, label: 'admin_dashboard' },
];

export const ADMIN_CODES = [
  "Ambu-A1B2C3", "Ambu-D4E5F6", "Ambu-G7H8I9", "Ambu-J1K2L3", "Ambu-M4N5O6", "Ambu-P7Q8R9", "Ambu-S1T2U3", "Ambu-V4W5X6", "Ambu-Y7Z8A9", "Ambu-B1C2D3", "Ambu-E4F5G6", "Ambu-H7I8J9", "Ambu-K1L2M3", "Ambu-N4O5P6", "Ambu-Q7R8S9", "Ambu-T1U2V3", "Ambu-W4X5Y6", "Ambu-Z7A8B9", "Ambu-C1D2E3", "Ambu-F4G5H6", "Ambu-I7J8K9", "Ambu-L1M2N3", "Ambu-O4P5Q6", "Ambu-R7S8T9", "Ambu-U1V2W3", "Ambu-X4Y5Z6", "Ambu-A7C8E9", "Ambu-B1D3F5", "Ambu-C2E4G6", "Ambu-D3F5H7", "Ambu-E4G6I8", "Ambu-F5H7J9", "Ambu-G6I8K1", "Ambu-H7J9L2", "Ambu-I8K1M3", "Ambu-J9L2N4", "Ambu-K1M3O5", "Ambu-L2N4P6", "Ambu-M3O5Q7", "Ambu-N4P6R8", "Ambu-O5Q7S9", "Ambu-P6R8T1", "Ambu-Q7S9U2", "Ambu-R8T1V3", "Ambu-S9U2W4", "Ambu-T1V3X5", "Ambu-U2W4Y6", "Ambu-V3X5Z7", "Ambu-W4Y6A8", "Ambu-X5Z7B9", "Ambu-Y6A8C1", "Ambu-Z7B9D2", "Ambu-A8C1E3", "Ambu-B9D2F4", "Ambu-C1E3G5", "Ambu-D2F4H6", "Ambu-E3G5I7", "Ambu-F4H6J8", "Ambu-G5I7K9", "Ambu-H6J8L1", "Ambu-I7K9M2", "Ambu-J8L1N3", "Ambu-K9M2O4", "Ambu-L1N3P5", "Ambu-M2O4Q6", "Ambu-N3P5R7", "Ambu-O4Q6S8", "Ambu-P5R7T9", "Ambu-Q6S8U1", "Ambu-R7T9V2", "Ambu-S8U1W3", "Ambu-T9V2X4", "Ambu-U1W3Y5", "Ambu-V2X4Z6", "Ambu-W3Y5A7", "Ambu-X4Z6B8", "Ambu-Y5A7C9", "Ambu-Z6B8D1", "Ambu-A7C9E2", "Ambu-B8D1F3", "Ambu-C9E2G4", "Ambu-D1F3H5", "Ambu-E2G4I6", "Ambu-F3H5J7", "Ambu-G4I6K8", "Ambu-H5J7L9", "Ambu-I6K8M1", "Ambu-J7L9N2", "Ambu-K8M1O3", "Ambu-L9N2P4", "Ambu-M1O3Q5", "Ambu-N2P4R6", "Ambu-O3Q5S7", "Ambu-P4R6T8", "Ambu-Q5S7U9", "Ambu-R6T8V1", "Ambu-S7U9W2", "Ambu-T8V1X3", "Ambu-U9W2Y4", "Ambu-V1X3Z5", "Ambu-W2Y4A6", "Ambu-X3Z5B7", "Ambu-Y4A6C8", "Ambu-Z5B7D9", "Ambu-A6C8E1", "Ambu-B7D9F2", "Ambu-C8E1G3", "Ambu-D9F2H4", "Ambu-E1G3I5", "Ambu-F2H4J6", "Ambu-G3I5K7", "Ambu-H4J6L8", "Ambu-I5K7M9", "Ambu-J6L8N1", "Ambu-K7M9O2", "Ambu-L8N1P3", "Ambu-M9O2Q4", "Ambu-N1P3R5", "Ambu-O2Q4S6", "Ambu-P3R5T7", "Ambu-Q4S6U8", "Ambu-R5T7V9", "Ambu-S6U8W1", "Ambu-T7V9X2", "Ambu-U8W1Y3", "Ambu-V9X2Z4", "Ambu-W1Y3A5", "Ambu-X2Z4B6", "Ambu-Y3A5C7", "Ambu-Z4B6D8", "Ambu-A5C7E9", "Ambu-B6D8F1", "Ambu-C7E9G2", "Ambu-D8F1H3", "Ambu-E9G2I4", "Ambu-F1H3J5", "Ambu-G2I4K6", "Ambu-H3J5L7", "Ambu-I4K6M8", "Ambu-J5L7N9", "Ambu-K6M8O1", "Ambu-L7N9P2", "Ambu-M8O1Q3", "Ambu-N9P2R4", "Ambu-O1Q3S5", "Ambu-P2R4T6", "Ambu-Q3S5U7", "Ambu-R4T6V8", "Ambu-S5U7W9", "Ambu-T6V8X1", "Ambu-U7W9Y2", "Ambu-V8X1Z3", "Ambu-W9Y2A4", "Ambu-X1Z3B5", "Ambu-Y2A4C6", "Ambu-Z3B5D7", "Ambu-A4C6E8", "Ambu-B5D7F9", "Ambu-C6E8G1", "Ambu-D7F9H2", "Ambu-E8G1I3", "Ambu-F9H2J4", "Ambu-G1I3K5", "Ambu-H2J4L6", "Ambu-I3K5M7", "Ambu-J4L6N8", "Ambu-K5M7O9", "Ambu-L6N8P1", "Ambu-M7O9Q2", "Ambu-N8P1R3", "Ambu-O9Q2S4", "Ambu-P1R3T5", "Ambu-Q2S4U6", "Ambu-R3T5V7", "Ambu-S4U6W8", "Ambu-T5V7X9", "Ambu-U6W8Y1", "Ambu-V7X9Z2", "Ambu-W8Y1A3", "Ambu-X9Z2B4", "Ambu-Y1A3C5", "Ambu-Z2B4D6", "Ambu-A3C5E7", "Ambu-B4D6F8", "Ambu-C5E7G9", "Ambu-D6F8H1", "Ambu-E7G9I2", "Ambu-F8H1J3", "Ambu-G9I2K4", "Ambu-H1J3L5", "Ambu-I2K4M6", "Ambu-J3L5N7", "Ambu-K4M6O8", "Ambu-L5N7P9", "Ambu-M6O8Q1", "Ambu-N7P9R2", "Ambu-O8Q1S3", "Ambu-P9R2T4", "Ambu-Q1S3U5", "Ambu-R2T4V6", "Ambu-S3U5W7", "Ambu-T4V6X8", "Ambu-U5W7Y9", "Ambu-V6X8Z1", "Ambu-W7Y9A2", "Ambu-X8Z1B3", "Ambu-Y9A2C4", "Ambu-Z1B3D5", "Ambu-A2C4E6", "Ambu-B3D5F7", "Ambu-C4E6G8", "Ambu-D5F7H9", "Ambu-E6G8I1", "Ambu-F7H9J2", "Ambu-G8I1K3", "Ambu-H9J2L4", "Ambu-I1K3M5", "Ambu-J2L4N6", "Ambu-K3M5O7", "Ambu-L4N6P8", "Ambu-M5O7Q9", "Ambu-N6P8R1", "Ambu-O7Q9S2", "Ambu-P8R1T3", "Ambu-Q9S2U4", "Ambu-R1T3V5", "Ambu-S2U4W6", "Ambu-T3V5X7", "Ambu-U4W6Y8", "Ambu-V5X7Z9", "Ambu-W6Y8A1", "Ambu-X7Z9B2", "Ambu-Y8A1C3", "Ambu-Z9B2D4"
];
