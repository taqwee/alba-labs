-- Lunomi Studio — launch reference data. Safe to run more than once.
-- These are editable placeholders (Admin > Services). No claims, prices or clients are invented.
insert into services (slug, title, summary, description, status, sort_order) values
 ('logo-design',     'Logo Design',     'A distinctive mark for your business.',            'Placeholder description. Edit this in Admin > Services.', 'ACTIVE', 10),
 ('brand-identity',  'Brand Identity',  'Colour, type and rules that keep your brand consistent.', 'Placeholder description. Edit this in Admin > Services.', 'ACTIVE', 20),
 ('brand-creation',  'Brand Creation',  'From name and positioning to a complete brand.',    'Placeholder description. Edit this in Admin > Services.', 'ACTIVE', 30),
 ('visual-identity', 'Visual Identity', 'A cohesive visual system across every touchpoint.', 'Placeholder description. Edit this in Admin > Services.', 'ACTIVE', 40),
 ('creative-design', 'Creative Design', 'Design for campaigns, print and digital.',         'Placeholder description. Edit this in Admin > Services.', 'ACTIVE', 50)
on conflict (slug) do nothing;

-- Future services, hidden until you activate them in the admin portal.
insert into services (slug, title, summary, status, sort_order) values
 ('website-development', 'Website Development', 'Fast, maintainable websites.', 'INACTIVE', 60),
 ('seo',                 'SEO',                 'Search visibility for your site.', 'INACTIVE', 70),
 ('social-media',        'Social Media',        'Social content and management.', 'INACTIVE', 80),
 ('cybersecurity',       'Cybersecurity',       'Security reviews and hardening.', 'INACTIVE', 90)
on conflict (slug) do nothing;

insert into service_features (service_id, label, sort_order)
select s.id, f.label, f.ord from services s
join (values ('logo-design','Concepts and revisions',1),('logo-design','Final files for print and web',2),
             ('brand-identity','Colour and typography system',1),('brand-identity','Usage guidelines',2)) as f(slug,label,ord)
  on f.slug = s.slug
where not exists (select 1 from service_features sf where sf.service_id = s.id and sf.label = f.label);
