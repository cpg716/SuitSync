.then(res => setAllUsers(Array.isArray(res.data) ? res.data : []))
.catch(() => setAllUsers([]))
.then(() => setLoadingUsers(false)); 