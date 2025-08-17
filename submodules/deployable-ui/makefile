# Minimal Makefile: bundle CSS only
# Usage:
#   make css        # build src/ui/css/framework.css
#   make clean      # remove the bundled file
#   make css VERBOSE=1  # print the files being concatenated

SHELL := /bin/bash

CSS_DIR := src/ui/css
OUT_CSS := $(CSS_DIR)/framework.css

# Order matters. Put theme first so variables are defined, then the rest.
CSS_FILES := \
  $(CSS_DIR)/theme.css \
  $(CSS_DIR)/style.css \
  $(CSS_DIR)/ui.css \
  $(CSS_DIR)/window.css \
  $(CSS_DIR)/components.form.css \
  $(CSS_DIR)/components.list.css \
  $(CSS_DIR)/components.modal.css \
  $(CSS_DIR)/components.toast.css \
  $(CSS_DIR)/components.spinner.css

.PHONY: css clean

css: $(OUT_CSS)

$(OUT_CSS): $(CSS_FILES)
	@echo "Bundling $@"
	@[ -n "$(VERBOSE)" ] && printf "  files:\\n  %s\\n" "$(CSS_FILES)" || true
	@tmp="$@.tmp"; \
	cat $(CSS_FILES) > "$$tmp" && mv "$$tmp" "$@"
	@echo "Wrote $@ ($$(wc -c < $@) bytes)"

clean:
	@rm -f $(OUT_CSS)
	@echo "Removed $(OUT_CSS)"
