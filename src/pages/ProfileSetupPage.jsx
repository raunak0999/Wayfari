import ProfileWizard from '../components/ProfileWizard';
import './ProfileSetupPage.css';

export default function ProfileSetupPage() {
  return (
    <div className="profile-setup-page" id="profile-setup-page">
      <div className="profile-setup-page__header">
        <h1>Set Up Your Profile</h1>
        <p>Complete your profile to start finding travel buddies!</p>
      </div>
      <ProfileWizard />
    </div>
  );
}
