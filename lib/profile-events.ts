export const PROFILE_UPDATED_EVENT = "fazumi:profile-updated";

export type ProfileUpdatedDetail = {
  avatarUrl?: string | null;
  fullName?: string | null;
};

export function dispatchProfileUpdated(detail: ProfileUpdatedDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ProfileUpdatedDetail>(PROFILE_UPDATED_EVENT, {
      detail,
    })
  );
}
