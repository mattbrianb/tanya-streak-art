// Everything under /api/admin needs a signed-in session.
// Changes must also carry X-Requested-With, which a cross-site form cannot send.
import { error } from '../../../lib/util.js';
import { isSignedIn } from '../../../lib/auth.js';

export async function onRequest({ request, env, next }) {
  if (!(await isSignedIn(env, request))) {
    if (request.method === 'GET' && new URL(request.url).searchParams.get('format') === 'csv') {
      return Response.redirect(new URL('/portal/#/subscribers', request.url).href, 302);
    }
    return error(401, 'Please sign in again.');
  }
  if (request.method !== 'GET' && request.headers.get('x-requested-with') !== 'portal') {
    return error(403, 'Request blocked.');
  }
  return next();
}
