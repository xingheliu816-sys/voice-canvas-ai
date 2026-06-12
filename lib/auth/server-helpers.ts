import { tryGetUser } from './guard';

export async function getCurrentUser() {
  return await tryGetUser();
}
