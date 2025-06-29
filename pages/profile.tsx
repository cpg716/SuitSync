<label htmlFor="name">Name</label>
<Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
<label htmlFor="email">Email</label>
<Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
<label htmlFor="current-password">Current Password</label>
<Input id="current-password" type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} required />
<label htmlFor="new-password">New Password</label>
<Input id="new-password" type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} required />
<label htmlFor="confirm-password">Confirm New Password</label>
<Input id="confirm-password" type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required /> 