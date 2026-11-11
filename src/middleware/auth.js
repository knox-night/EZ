module.exports=(req,res,next)=>{if(req.path==='/demo')return next();if(!req.session.userId)return res.status(401).json({error:'Please sign in to continue.'});next();};
