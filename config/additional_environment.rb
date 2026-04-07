Rails.application.configure do
  # Allow requests via Traefik reverse proxy (set TRAEFIK_HOST in .env).
  config.hosts << ENV["TRAEFIK_HOST"] if ENV["TRAEFIK_HOST"].present?
  # Allow internal Docker service-to-service requests.
  config.hosts << "redmine:3000"
  config.hosts << "www.example.com" if Rails.env.test?
end
