
export function CustomGoogleButton({ onClick }: { onClick: () => void }) {
  // This is a custom Google sign-in button component.
  return (
    <button
      onClick={onClick}
      className="google-button"
    >
      <img
        src="https://developers.google.com/identity/images/g-logo.png"
        alt="Google"
        style={{ width: 18, height: 18 }}
      />
      <span>Sign in with Google</span>
    </button>
  );
}
