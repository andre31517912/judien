declare const en: {
    readonly common: {
        readonly appName: "Judien";
        readonly save: "Save";
        readonly cancel: "Cancel";
        readonly delete: "Delete";
        readonly edit: "Edit";
        readonly loading: "Loading…";
        readonly error: "Something went wrong.";
        readonly back: "Back";
        readonly confirm: "Confirm";
    };
    readonly auth: {
        readonly login: "Log In";
        readonly signup: "Sign Up";
        readonly logout: "Log Out";
        readonly email: "Email";
        readonly password: "Password";
        readonly phone: "Phone Number";
        readonly displayName: "Display Name (nickname)";
        readonly forgotPassword: "Forgot password?";
        readonly noAccount: "Don't have an account?";
        readonly hasAccount: "Already have an account?";
        readonly signupSuccess: "Account created! Please verify your email.";
        readonly loginSuccess: "Welcome back!";
        readonly invalidCredentials: "Invalid email or password.";
    };
    readonly events: {
        readonly future: "Upcoming";
        readonly past: "Past";
        readonly noEvents: "No events yet.";
        readonly createEvent: "Create Event";
        readonly editEvent: "Edit Event";
        readonly deleteEvent: "Delete Event";
        readonly deleteConfirm: "Delete this event? This cannot be undone.";
        readonly startTime: "Starts";
        readonly endTime: "Ends";
        readonly location: "Location";
        readonly fee: "Fee";
        readonly free: "Free";
        readonly description: "Description";
        readonly coverImage: "Cover Image URL";
        readonly timezone: "Timezone";
        readonly titleEn: "Title (English)";
        readonly titleZh: "Title (Chinese)";
        readonly descriptionEn: "Description (English)";
        readonly descriptionZh: "Description (Chinese)";
        readonly locationEn: "Location (English)";
        readonly locationZh: "Location (Chinese)";
    };
    readonly rsvp: {
        readonly going: "Going";
        readonly maybe: "Maybe";
        readonly notGoing: "Not Going";
        readonly yourRsvp: "Your RSVP";
        readonly counts: "{{going}} Going · {{maybe}} Maybe · {{no}} Not Going";
    };
    readonly comments: {
        readonly title: "Comments";
        readonly placeholder: "Write a comment…";
        readonly post: "Post";
        readonly deleteComment: "Delete Comment";
        readonly noComments: "No comments yet.";
    };
    readonly profile: {
        readonly title: "Profile";
        readonly language: "Display Language";
        readonly muteSms: "Mute SMS notifications";
        readonly muteEmail: "Mute email notifications";
        readonly updateProfile: "Update Profile";
        readonly updateSuccess: "Profile updated.";
    };
    readonly admin: {
        readonly sendBlast: "Send Blast";
        readonly blastSent: "Blast sent successfully.";
        readonly reminders: "Reminders";
        readonly addReminder: "Add Reminder";
        readonly offsetMinutes: "Offset (minutes before event)";
        readonly channels: "Channels";
        readonly sms: "SMS";
        readonly email: "Email";
        readonly messageEn: "Message (English)";
        readonly messageZh: "Message (Chinese)";
        readonly audience: "Audience";
        readonly audienceRsvped: "All who RSVP'd";
        readonly audienceAll: "All registered users";
        readonly reminderSaved: "Reminders saved.";
    };
    readonly messages: {
        readonly reminderSubject: "{{title}} — reminder";
        readonly reminderBody: "Reminder: {{title}} starts on {{date}} at {{time}} ({{timezone}}).";
        readonly blastSubject: "{{title}} — update from organizer";
    };
};
type DeepString<T> = {
    [K in keyof T]: T[K] extends string ? string : T[K] extends object ? DeepString<T[K]> : T[K];
};
export type I18nDict = DeepString<typeof en>;
export default en;
//# sourceMappingURL=en.d.ts.map