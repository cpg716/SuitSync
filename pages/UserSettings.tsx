<label htmlFor="name">Name</label>
<Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
<label htmlFor="email">Email</label>
<Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
<Button variant={isDefault ? 'default' : 'outline'} size="sm" onClick={handleDefaultClick}>Default</Button>
{!isDefault && <Button size="sm" onClick={handleConfirmWeek}>Confirm Week</Button>} 