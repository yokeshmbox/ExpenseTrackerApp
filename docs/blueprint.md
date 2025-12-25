# **App Name**: Expense Tracker

## Core Features:

- Firebase Authentication: Secure user authentication via Firebase Auth, supporting email/password and Google login. Real-time synchronization with Firestore for user-specific data.
- Dashboard Overview: Display key performance indicators (KPIs) like Total Balance, Monthly Spending, and Savings Progress in an intuitive dashboard.
- Interactive Data Visualization: Visualize Income vs Expenses over the last 6 months using a smooth Area Chart, and present spending by category using a Donut chart.
- Transaction Management System: Implement a searchable and filterable transaction table/list with a quick add modal for adding Amount, Description, Category, Date and Type.
- Budgeting and Alerts: A budgeting page to allow users to set monthly limits per category, with progress bars that provide clear visuals, turning red when 90% limit is exceeded.
- Personalized Financial Advice: Provide AI-driven personalized recommendations to help users save money based on spending habits. Use this as a tool, by monitoring spending habits, comparing them with income, and providing useful saving opportunities, such as cutting down on certain subscriptions or negotiating better deals for utilities or insurance.
- Sheet View Toggle: Allow for toggling to sheet view of all transactions.

## Style Guidelines:

- Primary color: Dark slate (#2D3748) to provide a professional SaaS feel, based on the request for Slate-900.
- Accent colors: Emerald (#48BB78) for success/income, rose (#F56565) for expenses, and amber (#ED8936) for warnings. These colors match the requested Emerald-500, Rose-500 and Amber-500 values.
- Background color: Light gray (#F7FAFC) for a clean, minimalist backdrop, based on the request for Slate-50.
- Font pairing: 'Inter' (sans-serif) for both body and headline. It has a modern, neutral look that fits well with a clean and professional design aesthetic.
- Lucide-React icons for consistent and minimalist UI elements.  Category icons related to housing, food, and transport should match a modern aesthetic.
- Sidebar navigation permanent on desktop, hamburger menu on mobile. Primary content area with KPI cards, charts, and transaction list.
- Loading skeletons for data fetching and subtle toast notifications for user feedback.