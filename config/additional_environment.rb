Rails.application.configure do
  config.hosts << "redmine.int.sumsol.gr"
  config.hosts << "redmine:3000"
  config.hosts << "www.example.com" if Rails.env.test?
end
