# System Overview and Schema

Double K OS is quote-centered: Customer → Site / Location → Quotation → Quote Items → boss approval → final quote sent → Retail Job or Project → Payment → service history or project record.

The 13 databases are Customers, Sites / Locations, Services & Price List, Quotations, Quote Items, Retail Jobs, Projects, Project Documents, Variation Orders, Payments, SOP & Templates, AI Knowledge Base, and Excel Import Staging.

Quote ID is the company's existing human-readable reference. Relations connect it to customers, sites, jobs, projects, payments, and project documents. Quote Items calculate `Quantity × Unit Price − Discount Amount`.

Every final quote in v1 requires boss approval. Project quotes and variation orders always require boss approval. Excel rows remain in Excel Import Staging until manual review.
