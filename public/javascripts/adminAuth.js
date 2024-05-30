
/**
 * Check if User is authorized by entering a password
 * - MiddleWare function
 *
 * @param {Request} req Request
 * @param {Response} res Response
 * @param {NextFunction} next Next middleware function
 */
function authenticateUser(req, res, next) {
	// Password is correct - User is authorized - Move on
	if (req.body.pass === process.env.ADMIN_PASS) next();

	// Password is incorrect - Go to previous page
	else if (req.body.pass != undefined) {
		// Parse url
		const [, root, id] = req.originalUrl.split('/');

		// Use parsed url to redirect to detail page
		res.redirect(`/${root}/${id}`);
	} else { // First time - Render authorization form
		const file = {};
		if (req.file) {
			file.buffer = req.file.buffer;
			file.mimeType = req.file.mimetype;
		}

		res.render('auth_prompt', {
			title: 'Authorization',
			// Send the previous request body to the template so the
			// next request has the same body
			body: req.body,
			file: file,
		});
	}
}


module.exports = authenticateUser;
