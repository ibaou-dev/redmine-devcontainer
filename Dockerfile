FROM redmine:6.1.1

USER root

# Copy plugins before bundle install so PluginGemfiles are processed.
# At runtime the ./plugins volume mount overrides the plugin code,
# but gems installed into /usr/local/bundle persist from this build step.
COPY plugins/ /usr/src/redmine/plugins/

# 1. Install build tools
# 2. Install gems (now sees PluginGemfiles from the COPY above)
# 3. Fix permissions for the 'redmine' user
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && gem cleanup psych \
    && bundle config set --local without 'test' \
    && bundle install \
    # Fix permissions for the bundle path and the redmine home directory
    && chown -R redmine:redmine /usr/local/bundle /home/redmine \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

USER redmine