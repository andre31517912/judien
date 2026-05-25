import React from 'react';

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      <p className="text-xs text-gray-400 dark:text-gray-500">Effective date: May 24, 2026</p>

      <p>
        Judien ("we," "us," or "our") operates judien.com and related services. This Privacy Policy explains how we collect, use, and protect your information when you use Judien.
      </p>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">1. Information We Collect</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account info:</strong> display name, email address, phone number, and password (hashed).</li>
          <li><strong>Profile activity:</strong> events you create or RSVP to, groups you join, messages you send, and donations you record.</li>
          <li><strong>Connected accounts:</strong> if you link LINE, we store your LINE User ID to send push notifications.</li>
          <li><strong>Usage data:</strong> device type, browser, pages visited, and timestamps — collected via standard server logs.</li>
          <li><strong>Uploaded content:</strong> photos you upload for events or groups.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">2. How We Use Your Information</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operate and improve the Judien platform.</li>
          <li>Send event reminders, invitations, and notifications via SMS, email, or LINE.</li>
          <li>Allow group admins to manage their members.</li>
          <li>Respond to support requests.</li>
          <li>Comply with legal obligations.</li>
        </ul>
        <p className="mt-1">We do not sell your personal information to third parties.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">3. Sharing Your Information</h3>
        <p>We may share your information with:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li><strong>Group admins:</strong> can see your display name, email, phone, and role within their group.</li>
          <li><strong>Service providers:</strong> SMS gateways (Twilio), email providers (Resend), cloud hosting (Render, Vercel), and LINE messaging — only as needed to deliver the service.</li>
          <li><strong>Legal authorities:</strong> if required by law or to protect the rights of users and Judien.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">4. Notifications & Communications</h3>
        <p>
          By creating an account, you may receive transactional messages (event reminders, invitations). You can mute SMS, email, and LINE push notifications at any time in your profile settings.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">5. Data Retention</h3>
        <p>
          We retain your data as long as your account is active. You may request deletion of your account and associated data by contacting us. Certain records (e.g., donation history) may be retained as required by law.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">6. Security</h3>
        <p>
          We use industry-standard practices including HTTPS, hashed passwords, and access controls. No system is 100% secure — please use a strong, unique password for your account.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">7. Children's Privacy</h3>
        <p>
          Judien is not directed to children under 13. We do not knowingly collect personal information from children.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">8. Changes to This Policy</h3>
        <p>
          We may update this policy from time to time. We'll notify you of material changes via email or an in-app notice. Continued use of Judien after changes constitutes acceptance.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">9. Contact Us</h3>
        <p>
          Questions? Email us at <a href="mailto:hello@judien.com" className="text-indigo-600 underline">hello@judien.com</a>.
        </p>
      </section>
    </div>
  );
}

export function TermsOfUseContent() {
  return (
    <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      <p className="text-xs text-gray-400 dark:text-gray-500">Effective date: May 24, 2026</p>

      <p>
        Welcome to Judien. By creating an account or using judien.com, you agree to these Terms of Use. Please read them carefully.
      </p>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">1. Your Account</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be at least 13 years old to create an account.</li>
          <li>You are responsible for all activity under your account. Keep your password secure.</li>
          <li>Provide accurate information — fake identities or impersonation are not allowed.</li>
          <li>Notify us immediately if you suspect unauthorized use of your account.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">2. Acceptable Use</h3>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Post content that is illegal, harassing, defamatory, or abusive.</li>
          <li>Spam other users, send unsolicited messages, or scrape data from the platform.</li>
          <li>Attempt to hack, reverse-engineer, or disrupt Judien's systems.</li>
          <li>Use Judien for any unlawful purpose or to violate another person's rights.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">3. Events, Groups & Content</h3>
        <p>
          You retain ownership of content you create (events, posts, photos). By posting, you grant Judien a limited license to display and deliver that content to the intended audience (group members, event attendees). Group admins are responsible for the content and conduct of their group.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">4. Fees & Donations</h3>
        <p>
          Judien allows event organizers to record fees and donations. Judien does not process payments directly and is not liable for any financial transactions arranged between users. Any payment disputes are solely between the parties involved.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">5. Termination</h3>
        <p>
          We reserve the right to suspend or terminate your account for violations of these terms or for any conduct we deem harmful to the platform or its users. You may delete your account at any time by contacting us.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">6. Disclaimer of Warranties</h3>
        <p>
          Judien is provided "as is" without warranties of any kind. We do not guarantee the platform will be available at all times or free of errors. Use Judien at your own risk.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">7. Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by law, Judien and its team shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">8. Changes to These Terms</h3>
        <p>
          We may update these terms from time to time. We'll notify you of material changes via email or an in-app notice. Continued use of Judien constitutes acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">9. Contact Us</h3>
        <p>
          Questions? Email us at <a href="mailto:hello@judien.com" className="text-indigo-600 underline">hello@judien.com</a>.
        </p>
      </section>
    </div>
  );
}
