import { Navigate, createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "../layouts/dashboard-layout";
import { InboxPage } from "../modules/inbox/pages/inbox-page";
import { FilingCabinetPage } from "../modules/filing/pages/filing-cabinet-page";
import { SetupAccountsPage } from "../modules/accounts/pages/setup-accounts-page";
import { MappingIntegrationPage } from "../modules/mapping/pages/mapping-integration-page";
import { SetupEmailPage } from "../modules/email/pages/setup-email-page";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/vault/inbox" replace />
  },
  {
    path: "/vault",
    element: <DashboardLayout />,
    children: [
      {
        path: "inbox",
        element: <InboxPage />
      },
      {
        path: "filing",
        element: <FilingCabinetPage />
      },
      {
        path: "accounts",
        element: <SetupAccountsPage />
      },
      {
        path: "mappings",
        element: <MappingIntegrationPage />
      },
      {
        path: "email",
        element: <SetupEmailPage />
      }
    ]
  }
]);