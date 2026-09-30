import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-primary-950">{title}</h2>
    <div className="space-y-3 leading-7 text-muted-foreground">{children}</div>
  </section>
);

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/70 to-white" data-testid="privacy-policy-page">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Gowda Egg Distributors" className="h-11 w-11" />
            <div>
              <p className="font-semibold text-primary-950">Gowda Egg Distributors</p>
              <p className="text-xs text-muted-foreground">Customer App</p>
            </div>
          </Link>
          <Button variant="outline" asChild>
            <Link to="/"><ArrowLeft size={16} className="mr-2" />Home</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <ShieldCheck className="text-green-700" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-primary-950 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-muted-foreground">Effective date: 30 September 2026</p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-10 p-6 sm:p-10">
            <p className="leading-7 text-muted-foreground">
              Gowda Egg Distributors operates the Gowda Egg customer application. This policy explains what information we collect, why we use it, how it is protected, and how customers can request deletion of their account.
            </p>

            <Section title="Information we collect">
              <p>We may collect and process the following information:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Your registered phone number, shop name, address, assigned route, outstanding balance, and tray balance.</li>
                <li>Sales, collections, payment methods, invoice amounts, and related transaction history associated with your shop.</li>
                <li>Login and security information, including one-time-password verification records and active session information.</li>
                <li>A Firebase device token when you enable or receive push notifications. We do not use this token to track your physical location.</li>
                <li>Basic technical and diagnostic information required to keep the application secure and functioning.</li>
              </ul>
            </Section>

            <Section title="How we use information">
              <p>We use customer information to authenticate your account, display your balances and transaction history, provide payment and order updates, send requested OTP messages, deliver push notifications, prevent misuse, provide support, and comply with accounting or legal obligations.</p>
            </Section>

            <Section title="Service providers">
              <p>We may use service providers such as Meta WhatsApp, MSG91, Firebase Cloud Messaging, hosting providers, and database infrastructure to operate authentication and notifications. These providers process only the information necessary to deliver their services and are governed by their own privacy and security terms.</p>
            </Section>

            <Section title="Data sharing and sale">
              <p>We do not sell or rent customer personal information. Information is shared only with authorized personnel, operational service providers, or authorities when required by law.</p>
            </Section>

            <Section title="Data retention and security">
              <p>We use access controls, encrypted network connections, hashed OTP and refresh-token records, and other reasonable safeguards. Login OTP records expire automatically. Customer session records are revoked on logout and expire automatically. Business transaction records may be retained for accounting, dispute-resolution, fraud-prevention, and legal requirements.</p>
            </Section>

            <section id="delete-account" className="rounded-xl border border-red-200 bg-red-50/60 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2"><Trash2 size={20} className="text-red-600" /></div>
                <h2 className="text-xl font-semibold text-red-800">Delete your account</h2>
              </div>
              <div className="space-y-3 leading-7 text-red-950/75">
                <p>You can request deletion of your customer-app account by emailing <a className="font-semibold text-red-700 underline" href="mailto:support@gowdaegg.shop?subject=Customer%20Account%20Deletion%20Request">support@gowdaegg.shop</a>.</p>
                <p>Use the subject <strong>Customer Account Deletion Request</strong> and include your registered phone number and shop name so we can verify the request. Never send an OTP or password by email.</p>
                <p><strong>Your account will be deleted within seven days after we verify the request.</strong> Active login sessions and notification tokens will be revoked. Information that must be retained for tax, accounting, fraud-prevention, dispute, or other legal obligations may be retained only for the required period and will no longer be used for ordinary customer-app access.</p>
                <Button asChild className="mt-2 bg-red-600 hover:bg-red-700">
                  <a href="mailto:support@gowdaegg.shop?subject=Customer%20Account%20Deletion%20Request"><Mail size={16} className="mr-2" />Request account deletion</a>
                </Button>
              </div>
            </section>

            <Section title="Children’s privacy">
              <p>The application is intended for business customers and is not directed to children. We do not knowingly collect personal information from children.</p>
            </Section>

            <Section title="Changes to this policy">
              <p>We may update this policy when our services or legal obligations change. The latest version will always be available at this page with its effective date.</p>
            </Section>

            <Section title="Contact us">
              <p>For privacy questions, account access concerns, or deletion requests, email <a className="font-medium text-primary underline" href="mailto:support@gowdaegg.shop">support@gowdaegg.shop</a>.</p>
            </Section>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-white py-7 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Gowda Egg Distributors. All rights reserved.
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
