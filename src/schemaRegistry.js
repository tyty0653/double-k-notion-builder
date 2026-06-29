import {
  formula,
  multiSelect,
  property,
  relation,
  richText,
  select,
  title,
} from "./utils.js";

const timestamps = {
  "Created Date": property("created_time"),
  "Last Edited": property("last_edited_time"),
};

const page = (key, titleText, sections = []) => ({ key, title: titleText, sections });
const database = (key, titleText, parentPageKey, purpose, properties) => ({
  key,
  title: titleText,
  parentPageKey,
  purpose,
  properties: { ...properties, ...timestamps },
});
const linkedView = (key, pageKey, heading, databaseKey, name, options = {}) => ({
  key, pageKey, heading, databaseKey, name, type: "table", ...options,
});

const pages = [
  page("bossDashboard", "Boss Dashboard", ["Pending Boss Approval Quotes", "Today Retail Jobs", "Active Projects", "Outstanding Payments", "Quotes to Follow Up", "Expiring Quotes", "Recent Accepted Quotes", "Project Stage Overview", "Variation Orders Pending Approval", "Recent Imported Excel Records Needing Review", "Quick Links", "Boss Approval Quick Guide"]),
  page("retailDashboard", "Retail Dashboard", ["New Retail Quotes", "Waiting Info", "Need Boss Approval", "Boss Approved but Not Sent", "Sent / Follow Up", "Accepted Quotes to Create Jobs", "Today / Upcoming Jobs", "Completed Jobs Pending Payment", "WhatsApp Templates", "Retail SOP"]),
  page("projectDashboard", "Project Dashboard", ["New Project Enquiries", "Site Visit Required", "Costing in Progress", "Project Quotes Waiting Boss Approval", "Active Projects", "Project Documents", "Variation Orders", "Project Payments / Claims", "Project SOP"]),
  page("quotationCentre", "Quotation Centre", ["All Quotations", "Retail Quotations", "Project Quotations", "Need Boss Approval", "Boss Approved", "Sent", "Follow Up", "Accepted", "Rejected", "Expired", "Imported Excel Records", "Missing Quote ID", "Duplicate Quote ID"]),
  page("customerCrm", "Customer CRM"),
  page("servicePriceList", "Service & Price List"),
  page("retailJobsPage", "Retail Jobs"),
  page("projectManagement", "Project Management"),
  page("paymentsPage", "Payments"),
  page("sopTemplatesPage", "SOP & Templates"),
  page("aiKnowledgePage", "AI Knowledge Base"),
  page("excelImportPage", "Excel Import Staging"),
  page("setupGuide", "Setup & User Guide"),
];

const databases = [
  database("customers", "Customers", "customerCrm", "Store customer and company information.", {
    "Customer Name": title(),
    "Customer Type": select("Individual", "Company", "Contractor", "Management", "Other"),
    "Phone / WhatsApp": property("phone_number"),
    Email: property("email"),
    "Company Name": richText(),
    Source: select("Walk-in", "WhatsApp", "Facebook", "Instagram", "Referral", "Existing Customer", "Website", "Other"),
    Department: multiSelect("Retail", "Project", "Both"),
    Status: select("New", "Active", "Inactive", "Blacklist"),
    PIC: property("people"),
    Notes: richText(),
    "Related Sites": relation("sites"),
    "Related Quotations": relation("quotations"),
    "Related Jobs": relation("retailJobs"),
    "Related Projects": relation("projects"),
  }),
  database("sites", "Sites / Locations", "customerCrm", "Store customer service locations.", {
    "Site Name": title(),
    Customer: relation("customers"),
    Address: richText(),
    Area: select("JB", "Skudai", "Kulai", "Senai", "Tampoi", "Masai", "Pasir Gudang", "Ulu Tiram", "Other"),
    "Property Type": select("House", "Condo", "Shop", "Office", "Factory", "Site", "Other"),
    "Access Notes": richText(),
    "Parking / Guardhouse Notes": richText(),
    "Aircond Count": property("number"),
    "Site Photos": property("files"),
    "Related Quotations": relation("quotations"),
    "Related Retail Jobs": relation("retailJobs"),
    "Related Projects": relation("projects"),
    Notes: richText(),
  }),
  database("services", "Services & Price List", "servicePriceList", "Store services, pricing, and AI-ready rules.", {
    "Service Name": title(),
    Department: select("Retail", "Project", "Both"),
    Category: select("Cleaning", "Chemical Wash", "Installation", "Dismantle", "Relocation", "Repair", "Inspection", "Maintenance", "Project", "Other"),
    "Base Price": property("number"),
    "Min Price": property("number"),
    "Price Type": select("Fixed", "Variable", "Site Visit Required", "Project Costing Required"),
    Unit: select("Per Unit", "Per Job", "Per Project", "Per Visit", "Per Month", "Other"),
    Active: property("checkbox"),
    "Need Boss Approval": property("checkbox"),
    "AI Quotable": property("checkbox"),
    "AI Can Send Final Quote": property("checkbox"),
    "Max Auto Quote Amount": property("number"),
    "Required Questions": richText(),
    "AI Handover Rule": richText(),
    "Customer Description": richText(),
    "Internal Notes": richText(),
    "Related Quote Items": relation("quoteItems"),
  }),
  database("quotations", "Quotations", "quotationCentre", "Main Retail and Project quotation table.", {
    "Quote ID": title(),
    "Original Quote ID": richText(),
    "Quote Type": select("Retail", "Project"),
    Customer: relation("customers"),
    Site: relation("sites"),
    Status: select("Draft", "Waiting Info", "Manager Check", "Need Boss Approval", "Boss Approved", "Sent", "Follow Up", "Accepted", "Rejected", "Expired", "Cancelled"),
    "Quote Date": property("date"),
    "Valid Until": property("date"),
    PIC: property("people"),
    "Prepared By": property("people"),
    "Approved By": property("people"),
    "Approval Status": select("Not Submitted", "Pending Boss Approval", "Approved", "Rejected", "Revision Needed"),
    "Quote Version": property("number"),
    Source: select("Manual", "Excel Import", "WhatsApp AI Draft", "Other"),
    "Import Status": select("Not Imported", "Raw Import", "Needs Cleaning", "Cleaned", "Imported", "Duplicate Quote ID", "Missing Quote ID"),
    "Quote Year": property("number"),
    "Sequence No.": property("number"),
    "Duplicate Check Notes": richText(),
    "Created By AI": property("checkbox"),
    "AI Confidence": property("number"),
    "Discount Amount": property("number"),
    "Discount Reason": richText(),
    "Requested By": property("people"),
    "Final Approved Amount": property("number"),
    "Rejected Reason": select("Too Expensive", "Customer No Reply", "Competitor Cheaper", "Scope Changed", "Customer Postponed", "Wrong Enquiry", "Out of Service Area", "Other"),
    "Related Quote Items": relation("quoteItems"),
    "Related Retail Job": relation("retailJobs"),
    "Related Project": relation("projects"),
    "Related Payment": relation("payments"),
    Notes: richText(),
  }),
  database("quoteItems", "Quote Items", "quotationCentre", "Store quotation line items.", {
    "Item Name": title(),
    Quote: relation("quotations"),
    Service: relation("services"),
    Description: richText(),
    Quantity: property("number"),
    "Unit Price": property("number"),
    "Discount Amount": property("number"),
    Subtotal: formula('prop("Quantity") * prop("Unit Price") - prop("Discount Amount")'),
    "Internal Cost": property("number"),
    "Costing Notes": richText(),
    Notes: richText(),
  }),
  database("retailJobs", "Retail Jobs", "retailJobsPage", "Track accepted retail quotations and daily jobs.", {
    "Job ID": title(),
    Customer: relation("customers"),
    Site: relation("sites"),
    Quote: relation("quotations"),
    "Service Type": select("Cleaning", "Chemical Wash", "Installation", "Repair", "Inspection", "Maintenance", "Other"),
    "Job Status": select("To Schedule", "Scheduled", "In Progress", "Completed", "Cancelled", "Follow Up Needed"),
    "Appointment Date": property("date"),
    "Technician / Staff": property("people"),
    "Payment Status": select("Unpaid", "Deposit Paid", "Partial Paid", "Fully Paid", "Overdue"),
    "Before Photos": property("files"),
    "After Photos": property("files"),
    "Completion Notes": richText(),
    "Customer Feedback": richText(),
    "Next Follow Up Date": property("date"),
    "Related Payment": relation("payments"),
  }),
  database("projects", "Projects", "projectManagement", "Track engineering and project work.", {
    "Project Name": title(),
    "Project Code": richText(),
    Customer: relation("customers"),
    Site: relation("sites"),
    Quote: relation("quotations"),
    "Project Stage": select("Enquiry", "Site Visit", "Costing", "Quoted", "Negotiation", "Confirmed", "In Progress", "Completed", "Warranty", "Cancelled"),
    "Project Value": property("number"),
    "Start Date": property("date"),
    "Target Completion Date": property("date"),
    PIC: property("people"),
    "Site Supervisor": property("people"),
    "Payment Terms": select("Deposit", "Progress Claim", "Completion Payment", "Retention", "Other"),
    Documents: relation("projectDocuments"),
    "Variation Orders": relation("variationOrders"),
    Payments: relation("payments"),
    "Issues / Notes": richText(),
  }),
  database("projectDocuments", "Project Documents", "projectManagement", "Store BOQ, costing, drawings, PO, DO, and project files.", {
    "Document Name": title(),
    Project: relation("projects"),
    "Document Type": select("BOQ", "Costing", "Drawing", "PO", "DO", "Invoice", "Site Photo", "Handover", "Contract", "Other"),
    File: property("files"),
    Status: select("Draft", "Submitted", "Approved", "Rejected", "Archived"),
    "Uploaded By": property("people"),
    Notes: richText(),
    Date: property("date"),
  }),
  database("variationOrders", "Variation Orders", "projectManagement", "Track project scope changes and add-ons.", {
    "VO ID": title(),
    Project: relation("projects"),
    Description: richText(),
    Amount: property("number"),
    Status: select("Draft", "Need Boss Approval", "Sent", "Approved", "Rejected", "Cancelled"),
    "Approved By": property("people"),
    "Approved Date": property("date"),
    "Related Documents": relation("projectDocuments"),
    Notes: richText(),
  }),
  database("payments", "Payments", "paymentsPage", "Track simple operational payments, not accounting.", {
    "Payment Record": title(),
    Customer: relation("customers"),
    Quote: relation("quotations"),
    "Retail Job": relation("retailJobs"),
    Project: relation("projects"),
    "Payment Type": select("Deposit", "Partial Payment", "Full Payment", "Progress Claim", "Retention", "Refund", "Other"),
    Amount: property("number"),
    "Payment Status": select("Unpaid", "Deposit Paid", "Partial Paid", "Fully Paid", "Overdue"),
    "Due Date": property("date"),
    "Paid Date": property("date"),
    "Payment Method": select("Cash", "Bank Transfer", "Cheque", "Card", "Other"),
    Proof: property("files"),
    Notes: richText(),
  }),
  database("sopTemplates", "SOP & Templates", "sopTemplatesPage", "Store SOPs, templates, policies, and internal guides.", {
    Title: title(),
    Type: select("SOP", "WhatsApp Template", "Quote Template", "Policy", "FAQ", "Internal Guide"),
    Department: select("Retail", "Project", "Admin", "Boss", "AI", "All"),
    Status: select("Draft", "Active", "Needs Review", "Archived"),
    Owner: property("people"),
    "Last Reviewed": property("date"),
    Content: richText(),
    "Related Service": relation("services"),
    Notes: richText(),
  }),
  database("aiKnowledgeBase", "AI Knowledge Base", "aiKnowledgePage", "Prepare structured future AI knowledge and safety rules.", {
    "Knowledge Title": title(),
    "AI Category": select("FAQ", "Service Rule", "Price Rule", "Handover Rule", "Customer Intake Question", "Quote Rule", "Project Rule"),
    Department: select("Retail", "Project", "Both"),
    "Related Service": relation("services"),
    "Customer-Facing Answer": richText(),
    "Internal Rule": richText(),
    "Required Questions": richText(),
    "Handover Trigger": richText(),
    "Can AI Answer Directly": property("checkbox"),
    "Can AI Create Quote Draft": property("checkbox"),
    "Can AI Send Final Quote": property("checkbox"),
    "Need Boss Approval": property("checkbox"),
    Status: select("Draft", "Active", "Needs Review", "Archived"),
  }),
  database("excelImportStaging", "Excel Import Staging", "excelImportPage", "Hold old Excel rows for manual cleaning and mapping.", {
    "Import Row ID": title(),
    "Original Quote Number": richText(),
    "Original Customer Name": richText(),
    "Original Phone": richText(),
    "Original Date": property("date"),
    "Original Service Description": richText(),
    "Original Amount": property("number"),
    "Original Status": richText(),
    "Mapped Customer": relation("customers"),
    "Mapped Site": relation("sites"),
    "Mapped Quote": relation("quotations"),
    "Quote ID Status": select("Valid", "Missing Quote ID", "Duplicate Quote ID", "Needs Manual Review"),
    "Import Status": select("Raw", "Needs Cleaning", "Mapped", "Imported", "Skipped"),
    "Cleaning Notes": richText(),
    "Source File": property("files"),
  }),
];

const quotationProperties = ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Final Approved Amount"];
const compactQuoteProperties = ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Quote Date", "Valid Until", "PIC", "Final Approved Amount"];
const linkedViews = [
  linkedView("quotation-centre-retail", "quotationCentre", "Retail Quotations", "quotations", "Retail Quotations", { filter: { property: "Quote Type", select: { equals: "Retail" } }, sorts: [{ property: "Quote Date", direction: "descending" }], visibleProperties: quotationProperties }),
  linkedView("quotation-centre-project", "quotationCentre", "Project Quotations", "quotations", "Project Quotations", { filter: { property: "Quote Type", select: { equals: "Project" } }, sorts: [{ property: "Quote Date", direction: "descending" }], visibleProperties: quotationProperties }),
  linkedView("quotation-centre-approval", "quotationCentre", "Need Boss Approval", "quotations", "Need Boss Approval", { filter: { property: "Status", select: { equals: "Need Boss Approval" } }, sorts: [{ property: "Quote Date", direction: "ascending" }], visibleProperties: quotationProperties }),
  linkedView("quotation-centre-approved", "quotationCentre", "Boss Approved", "quotations", "Boss Approved", { filter: { property: "Status", select: { equals: "Boss Approved" } }, sorts: [{ property: "Last Edited", direction: "descending" }], visibleProperties: quotationProperties }),
  linkedView("quotation-centre-follow-up", "quotationCentre", "Follow Up", "quotations", "Follow Up", { filter: { property: "Status", select: { equals: "Follow Up" } }, sorts: [{ property: "Valid Until", direction: "ascending" }], visibleProperties: quotationProperties }),
  linkedView("boss-pending-approval", "bossDashboard", "Pending Boss Approval Quotes", "quotations", "Pending Boss Approval Quotes", { filter: { property: "Status", select: { equals: "Need Boss Approval" } }, sorts: [{ property: "Quote Date", direction: "ascending" }], visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Discount Amount", "Requested By", "Final Approved Amount"] }),
  linkedView("boss-today-retail-jobs", "bossDashboard", "Today Retail Jobs", "retailJobs", "Today Retail Jobs", { filter: { and: [{ property: "Appointment Date", date: { equals: "today" } }, { property: "Job Status", select: { does_not_equal: "Cancelled" } }] }, sorts: [{ property: "Appointment Date", direction: "ascending" }], visibleProperties: ["Job ID", "Customer", "Site", "Service Type", "Job Status", "Appointment Date", "Technician / Staff", "Payment Status"] }),
  linkedView("boss-active-projects", "bossDashboard", "Active Projects", "projects", "Active Projects", { filter: { property: "Project Stage", select: { equals: ["Confirmed", "In Progress"] } }, sorts: [{ property: "Target Completion Date", direction: "ascending" }], visibleProperties: ["Project Name", "Project Code", "Customer", "Site", "Project Stage", "Project Value", "PIC", "Target Completion Date"] }),
  linkedView("boss-outstanding-payments", "bossDashboard", "Outstanding Payments", "payments", "Outstanding Payments", { filter: { property: "Payment Status", select: { equals: ["Unpaid", "Deposit Paid", "Partial Paid", "Overdue"] } }, sorts: [{ property: "Due Date", direction: "ascending" }], visibleProperties: ["Payment Record", "Customer", "Quote", "Retail Job", "Project", "Payment Type", "Amount", "Payment Status", "Due Date", "Paid Date"] }),
  linkedView("boss-quotes-follow-up", "bossDashboard", "Quotes to Follow Up", "quotations", "Quotes to Follow Up", { filter: { property: "Status", select: { equals: "Follow Up" } }, sorts: [{ property: "Valid Until", direction: "ascending" }], visibleProperties: compactQuoteProperties }),
  linkedView("boss-expiring-quotes", "bossDashboard", "Expiring Quotes", "quotations", "Expiring Quotes", { filter: { and: [{ property: "Valid Until", date: { next_week: {} } }, { property: "Status", select: { equals: ["Sent", "Follow Up"] } }] }, sorts: [{ property: "Valid Until", direction: "ascending" }], visibleProperties: compactQuoteProperties }),
  linkedView("boss-recent-accepted", "bossDashboard", "Recent Accepted Quotes", "quotations", "Recent Accepted Quotes", { filter: { property: "Status", select: { equals: "Accepted" } }, sorts: [{ property: "Last Edited", direction: "descending" }], visibleProperties: compactQuoteProperties }),
  linkedView("boss-project-stage-overview", "bossDashboard", "Project Stage Overview", "projects", "Project Stage Overview", { type: "board", filter: { property: "Project Stage", select: { does_not_equal: ["Completed", "Cancelled"] } }, sorts: [{ property: "Target Completion Date", direction: "ascending" }], visibleProperties: ["Project Name", "Project Code", "Customer", "Site", "Project Stage", "Project Value", "PIC", "Target Completion Date"], groupBy: { property: "Project Stage", type: "select", groupBy: "option" } }),
  linkedView("boss-variation-approval", "bossDashboard", "Variation Orders Pending Approval", "variationOrders", "Variation Orders Pending Approval", { filter: { property: "Status", select: { equals: "Need Boss Approval" } }, sorts: [{ property: "Created Date", direction: "ascending" }], visibleProperties: ["VO ID", "Project", "Description", "Amount", "Status", "Approved By", "Approved Date"] }),
  linkedView("boss-import-review", "bossDashboard", "Recent Imported Excel Records Needing Review", "excelImportStaging", "Recent Imported Excel Records Needing Review", { filter: { or: [{ property: "Quote ID Status", select: { equals: ["Missing Quote ID", "Duplicate Quote ID", "Needs Manual Review"] } }, { property: "Import Status", select: { equals: ["Raw", "Needs Cleaning"] } }] }, sorts: [{ property: "Created Date", direction: "descending" }], visibleProperties: ["Import Row ID", "Original Quote Number", "Original Customer Name", "Original Date", "Original Amount", "Quote ID Status", "Import Status", "Cleaning Notes"] }),
];

const csvTemplates = [
  ["customers", "customers.csv", ["Customer Name", "Customer Type", "Phone / WhatsApp", "Email", "Company Name", "Source", "Department", "Status", "Notes"]],
  ["sites", "sites.csv", ["Site Name", "Customer", "Address", "Area", "Property Type", "Access Notes", "Parking / Guardhouse Notes", "Aircond Count", "Notes"]],
  ["services", "services_price_list.csv", ["Service Name", "Department", "Category", "Base Price", "Min Price", "Price Type", "Unit", "Active", "Need Boss Approval", "AI Quotable", "AI Can Send Final Quote", "Max Auto Quote Amount", "Required Questions", "AI Handover Rule", "Customer Description", "Internal Notes"]],
  ["quotations", "quotations.csv", ["Quote ID", "Original Quote ID", "Quote Type", "Customer", "Site", "Status", "Quote Date", "Valid Until", "Approval Status", "Quote Version", "Source", "Import Status", "Discount Amount", "Discount Reason", "Final Approved Amount", "Notes"]],
  ["quoteItems", "quote_items.csv", ["Item Name", "Quote", "Service", "Description", "Quantity", "Unit Price", "Discount Amount", "Internal Cost", "Costing Notes", "Notes"]],
  ["retailJobs", "retail_jobs.csv", ["Job ID", "Customer", "Site", "Quote", "Service Type", "Job Status", "Appointment Date", "Payment Status", "Completion Notes", "Customer Feedback", "Next Follow Up Date"]],
  ["projects", "projects.csv", ["Project Name", "Project Code", "Customer", "Site", "Quote", "Project Stage", "Project Value", "Start Date", "Target Completion Date", "Payment Terms", "Issues / Notes"]],
  ["projectDocuments", "project_documents.csv", ["Document Name", "Project", "Document Type", "Status", "Notes", "Date"]],
  ["variationOrders", "variation_orders.csv", ["VO ID", "Project", "Description", "Amount", "Status", "Approved Date", "Notes"]],
  ["payments", "payments.csv", ["Payment Record", "Customer", "Quote", "Retail Job", "Project", "Payment Type", "Amount", "Payment Status", "Due Date", "Paid Date", "Payment Method", "Notes"]],
  ["sopTemplates", "sop_templates.csv", ["Title", "Type", "Department", "Status", "Last Reviewed", "Content", "Related Service", "Notes"]],
  ["aiKnowledgeBase", "ai_knowledge_base.csv", ["Knowledge Title", "AI Category", "Department", "Related Service", "Customer-Facing Answer", "Internal Rule", "Required Questions", "Handover Trigger", "Can AI Answer Directly", "Can AI Create Quote Draft", "Can AI Send Final Quote", "Need Boss Approval", "Status"]],
  ["excelImportStaging", "excel_import_staging.csv", ["Import Row ID", "Original Quote Number", "Original Customer Name", "Original Phone", "Original Date", "Original Service Description", "Original Amount", "Original Status", "Quote ID Status", "Import Status", "Cleaning Notes"]],
].map(([databaseKey, filename, columns]) => ({ databaseKey, filename, columns }));

const sample = (key, titleText, properties = {}, relations = {}) => ({
  key,
  title: titleText,
  properties: { ...properties, Notes: properties.Notes ?? "[Sample] Fictional training record." },
  relations,
});

const seeds = {
  services: [
    sample("service-wall-normal-cleaning", "Wall Mounted Aircond Normal Cleaning", { Department: "Retail", Category: "Cleaning", "Base Price": 90, "Min Price": 90, "Price Type": "Fixed", Unit: "Per Unit", Active: true, "Need Boss Approval": true, "AI Quotable": true, "AI Can Send Final Quote": false, "Max Auto Quote Amount": 0 }),
    sample("service-wall-chemical-wash", "Wall Mounted Aircond Chemical Wash", { Department: "Retail", Category: "Chemical Wash", "Base Price": 180, "Min Price": 180, "Price Type": "Fixed", Unit: "Per Unit", Active: true, "Need Boss Approval": true }),
    sample("service-cassette-cleaning", "Cassette Aircond Cleaning", { Department: "Retail", Category: "Cleaning", "Base Price": 220, "Price Type": "Variable", Unit: "Per Unit", Active: true, "Need Boss Approval": true }),
    sample("service-installation", "Aircond Installation", { Department: "Retail", Category: "Installation", "Price Type": "Site Visit Required", Unit: "Per Job", Active: true, "Need Boss Approval": true }),
    sample("service-dismantle", "Aircond Dismantle", { Department: "Retail", Category: "Dismantle", "Base Price": 120, "Price Type": "Variable", Unit: "Per Unit", Active: true, "Need Boss Approval": true }),
    sample("service-relocation", "Aircond Relocation", { Department: "Retail", Category: "Relocation", "Price Type": "Site Visit Required", Unit: "Per Job", Active: true, "Need Boss Approval": true }),
    sample("service-inspection", "Aircond Inspection", { Department: "Retail", Category: "Inspection", "Base Price": 80, "Price Type": "Fixed", Unit: "Per Visit", Active: true, "Need Boss Approval": true }),
    sample("service-project-engineering", "Project Aircond Installation / Engineering Work", { Department: "Project", Category: "Project", "Price Type": "Project Costing Required", Unit: "Per Project", Active: true, "Need Boss Approval": true }),
  ],
  customers: [
    sample("customer-horizon", "Horizon Facilities Sdn. Bhd.", { "Customer Type": "Company", "Company Name": "Horizon Facilities Sdn. Bhd.", Source: "Referral", Department: ["Both"], Status: "Active" }),
    sample("customer-taman-molek", "Taman Molek Homeowner (Sample)", { "Customer Type": "Individual", Source: "WhatsApp", Department: ["Retail"], Status: "New" }),
    sample("customer-southern-works", "Southern Works Contractor (Sample)", { "Customer Type": "Contractor", Source: "Existing Customer", Department: ["Project"], Status: "Active" }),
  ],
  sites: [
    sample("site-horizon-office", "Horizon Office - JB", { Address: "Sample address, Johor Bahru", Area: "JB", "Property Type": "Office", "Aircond Count": 8 }, { Customer: "customer-horizon" }),
    sample("site-molek-home", "Taman Molek Residence", { Address: "Sample address, Taman Molek", Area: "JB", "Property Type": "House", "Aircond Count": 3 }, { Customer: "customer-taman-molek" }),
    sample("site-senai-factory", "Senai Factory Upgrade Site", { Address: "Sample industrial address, Senai", Area: "Senai", "Property Type": "Factory", "Aircond Count": 20 }, { Customer: "customer-southern-works" }),
  ],
  quotations: [
    sample("quote-retail-1", "SAMPLE-EXISTING-QUOTE-001", { "Quote Type": "Retail", Status: "Need Boss Approval", "Approval Status": "Pending Boss Approval", Source: "Manual", "Import Status": "Not Imported", "Quote Version": 1 }, { Customer: "customer-taman-molek", Site: "site-molek-home" }),
    sample("quote-retail-2", "SAMPLE-EXISTING-QUOTE-002", { "Quote Type": "Retail", Status: "Accepted", "Approval Status": "Approved", Source: "Manual", "Import Status": "Not Imported", "Quote Version": 1 }, { Customer: "customer-horizon", Site: "site-horizon-office" }),
    sample("quote-retail-3", "SAMPLE-EXISTING-QUOTE-003", { "Quote Type": "Retail", Status: "Sent", "Approval Status": "Approved", Source: "Manual", "Import Status": "Not Imported", "Quote Version": 1 }, { Customer: "customer-taman-molek", Site: "site-molek-home" }),
    sample("quote-project-1", "SAMPLE-EXISTING-PROJECT-001", { "Quote Type": "Project", Status: "Need Boss Approval", "Approval Status": "Pending Boss Approval", Source: "Manual", "Import Status": "Not Imported", "Quote Version": 1 }, { Customer: "customer-southern-works", Site: "site-senai-factory" }),
    sample("quote-project-2", "SAMPLE-EXISTING-PROJECT-002", { "Quote Type": "Project", Status: "Accepted", "Approval Status": "Approved", Source: "Manual", "Import Status": "Not Imported", "Quote Version": 2 }, { Customer: "customer-horizon", Site: "site-horizon-office" }),
  ],
  quoteItems: [
    sample("item-1", "Normal Cleaning x 3", { Description: "Sample cleaning scope", Quantity: 3, "Unit Price": 90, "Discount Amount": 0 }, { Quote: "quote-retail-1", Service: "service-wall-normal-cleaning" }),
    sample("item-2", "Chemical Wash x 1", { Quantity: 1, "Unit Price": 180, "Discount Amount": 0 }, { Quote: "quote-retail-2", Service: "service-wall-chemical-wash" }),
    sample("item-3", "Inspection Visit", { Quantity: 1, "Unit Price": 80, "Discount Amount": 0 }, { Quote: "quote-retail-3", Service: "service-inspection" }),
    sample("item-4", "Project Engineering Scope", { Quantity: 1, "Unit Price": 45000, "Discount Amount": 0 }, { Quote: "quote-project-1", Service: "service-project-engineering" }),
    sample("item-5", "Project Installation Scope", { Quantity: 1, "Unit Price": 28000, "Discount Amount": 0 }, { Quote: "quote-project-2", Service: "service-project-engineering" }),
    sample("item-6", "Cassette Cleaning", { Quantity: 2, "Unit Price": 220, "Discount Amount": 20 }, { Quote: "quote-retail-2", Service: "service-cassette-cleaning" }),
    sample("item-7", "Dismantle Unit", { Quantity: 1, "Unit Price": 120, "Discount Amount": 0 }, { Quote: "quote-retail-3", Service: "service-dismantle" }),
  ],
  retailJobs: [
    sample("job-1", "SAMPLE-JOB-001", { "Service Type": "Cleaning", "Job Status": "Scheduled", "Payment Status": "Unpaid" }, { Customer: "customer-horizon", Site: "site-horizon-office", Quote: "quote-retail-2" }),
    sample("job-2", "SAMPLE-JOB-002", { "Service Type": "Inspection", "Job Status": "Completed", "Payment Status": "Fully Paid" }, { Customer: "customer-taman-molek", Site: "site-molek-home", Quote: "quote-retail-3" }),
  ],
  projects: [
    sample("project-1", "Senai Factory Aircond Upgrade (Sample)", { "Project Code": "SAMPLE-PROJECT-A", "Project Stage": "Costing", "Project Value": 45000, "Payment Terms": "Progress Claim" }, { Customer: "customer-southern-works", Site: "site-senai-factory", Quote: "quote-project-1" }),
    sample("project-2", "Horizon Office Retrofit (Sample)", { "Project Code": "SAMPLE-PROJECT-B", "Project Stage": "Confirmed", "Project Value": 28000, "Payment Terms": "Deposit" }, { Customer: "customer-horizon", Site: "site-horizon-office", Quote: "quote-project-2" }),
  ],
  projectDocuments: [
    sample("document-1", "Sample Factory BOQ", { "Document Type": "BOQ", Status: "Draft" }, { Project: "project-1" }),
    sample("document-2", "Sample Office Drawing", { "Document Type": "Drawing", Status: "Approved" }, { Project: "project-2" }),
  ],
  variationOrders: [
    sample("vo-1", "SAMPLE-VO-001", { Description: "Additional sample piping work", Amount: 1800, Status: "Need Boss Approval" }, { Project: "project-2" }),
  ],
  payments: [
    sample("payment-1", "Sample Retail Payment 1", { "Payment Type": "Full Payment", Amount: 600, "Payment Status": "Fully Paid", "Payment Method": "Bank Transfer" }, { Customer: "customer-horizon", Quote: "quote-retail-2", "Retail Job": "job-1" }),
    sample("payment-2", "Sample Project Deposit", { "Payment Type": "Deposit", Amount: 8400, "Payment Status": "Deposit Paid", "Payment Method": "Bank Transfer" }, { Customer: "customer-horizon", Quote: "quote-project-2", Project: "project-2" }),
    sample("payment-3", "Sample Progress Claim", { "Payment Type": "Progress Claim", Amount: 15000, "Payment Status": "Unpaid" }, { Customer: "customer-southern-works", Quote: "quote-project-1", Project: "project-1" }),
  ],
  sopTemplates: [
    sample("sop-retail", "Retail Quote SOP", { Type: "SOP", Department: "Retail", Status: "Active", Content: "Create customer, site, quote items, then submit for boss approval." }),
    sample("sop-project", "Project Quote SOP", { Type: "SOP", Department: "Project", Status: "Active", Content: "Complete site visit, costing, project quote, and boss approval." }),
    sample("sop-boss", "Boss Approval SOP", { Type: "SOP", Department: "Boss", Status: "Active", Content: "Review scope, price, discount, and approval status before sending." }),
    sample("template-whatsapp", "Retail Enquiry Reply Template", { Type: "WhatsApp Template", Department: "Retail", Status: "Active", Content: "Thank you for contacting Double K. Please provide service location and unit details." }),
    sample("policy-quote-id", "Quote ID Preservation Policy", { Type: "Policy", Department: "All", Status: "Active", Content: "Use Double K's existing manually entered quote sequence. Never invent numbers." }),
  ],
  aiKnowledgeBase: [
    sample("ai-faq", "Normal Cleaning FAQ", { "AI Category": "FAQ", Department: "Retail", "Customer-Facing Answer": "Normal cleaning scope depends on unit condition.", "Can AI Answer Directly": true, "Can AI Create Quote Draft": true, "Can AI Send Final Quote": false, "Need Boss Approval": true, Status: "Active" }, { "Related Service": "service-wall-normal-cleaning" }),
    sample("ai-intake", "Retail Customer Intake Questions", { "AI Category": "Customer Intake Question", Department: "Retail", "Required Questions": "Name, phone, address, unit type, quantity, symptoms, preferred date.", "Can AI Answer Directly": true, "Can AI Create Quote Draft": true, "Can AI Send Final Quote": false, "Need Boss Approval": true, Status: "Active" }),
    sample("ai-price", "Fixed Price Safety Rule", { "AI Category": "Price Rule", Department: "Retail", "Internal Rule": "Only fixed active services may be considered for a future draft.", "Can AI Answer Directly": false, "Can AI Create Quote Draft": true, "Can AI Send Final Quote": false, "Need Boss Approval": true, Status: "Active" }),
    sample("ai-handover", "Unclear Request Handover", { "AI Category": "Handover Rule", Department: "Both", "Handover Trigger": "Any unclear scope, discount, site visit, or project request.", "Can AI Answer Directly": false, "Can AI Create Quote Draft": true, "Can AI Send Final Quote": false, "Need Boss Approval": true, Status: "Active" }),
    sample("ai-project", "Project Enquiry Rule", { "AI Category": "Project Rule", Department: "Project", "Internal Rule": "Project enquiries always require staff costing and boss approval.", "Can AI Answer Directly": true, "Can AI Create Quote Draft": true, "Can AI Send Final Quote": false, "Need Boss Approval": true, Status: "Active" }),
  ],
};

export const systemSchema = {
  version: 1,
  root: { key: "doubleKOs", title: "Double K OS" },
  pages,
  databases,
  views: [
    { key: "quotes-approval", databaseKey: "quotations", name: "Need Boss Approval", type: "table", filter: { property: "Status", select: { equals: "Need Boss Approval" } } },
    { key: "quotes-follow-up", databaseKey: "quotations", name: "Follow Up", type: "table", filter: { property: "Status", select: { equals: "Follow Up" } } },
    { key: "jobs-upcoming", databaseKey: "retailJobs", name: "Upcoming Jobs", type: "table", sorts: [{ property: "Appointment Date", direction: "ascending" }] },
    { key: "projects-active", databaseKey: "projects", name: "Active Projects", type: "table" },
  ],
  linkedViews,
  csvTemplates,
  seeds,
};

export function databaseByKey(key) {
  return systemSchema.databases.find((entry) => entry.key === key);
}

export function validateSchema(schema) {
  const errors = [];
  const pageKeys = new Set(schema.pages.map(({ key }) => key));
  const databaseKeys = new Set(schema.databases.map(({ key }) => key));

  if (pageKeys.size !== schema.pages.length) errors.push("Duplicate page key");
  if (databaseKeys.size !== schema.databases.length) errors.push("Duplicate database key");

  const filterProperties = (filter) => {
    if (!filter) return [];
    if (filter.property) return [filter.property];
    return [...(filter.and ?? []), ...(filter.or ?? [])].flatMap(filterProperties);
  };
  const linkedKeys = new Set((schema.linkedViews ?? []).map(({ key }) => key));
  if (linkedKeys.size !== (schema.linkedViews ?? []).length) errors.push("Duplicate linked view key");
  for (const view of schema.linkedViews ?? []) {
    const targetPage = schema.pages.find(({ key }) => key === view.pageKey);
    const targetDatabase = schema.databases.find(({ key }) => key === view.databaseKey);
    if (!targetPage) errors.push(`${view.key}: invalid linked view page`);
    if (targetPage && !(targetPage.sections ?? []).includes(view.heading)) errors.push(`${view.key}: invalid linked view heading`);
    if (!targetDatabase) errors.push(`${view.key}: invalid linked view database`);
    const referenced = [...(view.visibleProperties ?? []), ...(view.sorts ?? []).map(({ property }) => property), ...filterProperties(view.filter), ...(view.groupBy ? [view.groupBy.property] : [])];
    for (const name of referenced) if (targetDatabase && !targetDatabase.properties[name]) errors.push(`${view.key}: invalid property ${name}`);
    if (view.type === "board" && !view.groupBy) errors.push(`${view.key}: board requires groupBy`);
  }

  for (const entry of schema.databases) {
    if (!pageKeys.has(entry.parentPageKey)) errors.push(`${entry.key}: invalid parent page`);
    const titleCount = Object.values(entry.properties).filter(({ type }) => type === "title").length;
    if (titleCount !== 1) errors.push(`${entry.key}: expected one title property`);
    for (const [name, definition] of Object.entries(entry.properties)) {
      if (definition.type === "relation" && !databaseKeys.has(definition.target)) {
        errors.push(`${entry.key}.${name}: invalid relation target ${definition.target}`);
      }
    }
  }

  if (databaseByKey("quotations")?.properties?.["Quote ID"]?.type !== "title") {
    errors.push("Quotations must use a manually editable Quote ID title");
  }

  const csvNames = schema.csvTemplates.map(({ filename }) => filename);
  if (new Set(csvNames).size !== csvNames.length) errors.push("Duplicate CSV filename");
  for (const template of schema.csvTemplates) {
    if (!databaseKeys.has(template.databaseKey)) errors.push(`${template.filename}: invalid database`);
  }

  const allSeedKeys = new Set(Object.values(schema.seeds).flat().map(({ key }) => key));
  if (allSeedKeys.size !== Object.values(schema.seeds).flat().length) errors.push("Duplicate seed key");
  for (const [databaseKey, rows] of Object.entries(schema.seeds)) {
    if (!databaseKeys.has(databaseKey)) errors.push(`${databaseKey}: invalid seed database`);
    for (const row of rows) {
      for (const target of Object.values(row.relations ?? {})) {
        if (!allSeedKeys.has(target)) errors.push(`${row.key}: invalid seed relation ${target}`);
      }
    }
  }
  return errors;
}
