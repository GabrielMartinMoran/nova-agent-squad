.PHONY: build install uninstall validate help check-deps list-platform-templates doctor test

TARGET ?= opencode
DRY_RUN ?= 0
DESTDIR ?=

# Default target
help:
	@echo "Nova Agent Squad - Makefile"
	@echo ""
	@echo "make commands:"
	@echo "  make build TARGET=<target|all> - Build centralized artifacts to dist/"
	@echo "  make install TARGET=<target> [DRY_RUN=1] [DESTDIR=...] - Install built target"
	@echo "  make uninstall   - Remove agents from global OpenCode config"
	@echo "  make validate   - Validate agent file structure"
	@echo "  make doctor     - Check build/install preconditions"
	@echo "  make test       - Run contractual tests"
	@echo "  make list-platform-templates - List distribution templates by platform"
	@echo "  make check-deps - Check OpenCode installation"
	@echo "  make help       - Show this help message"
	@echo ""
	@echo "supported platform TARGET values:"
	@awk -F'|' '!/^#/ && NF {printf "  - %s\n", $$1}' config/platforms.manifest
	@echo ""

list-platform-templates:
	@echo "Available NAS distribution templates:"
	@find dist/platforms -mindepth 1 -maxdepth 1 -type d -printf "- %f\n" 2>/dev/null || echo "(none)"

build:
	@bash scripts/build.sh "$(TARGET)"

check-deps:
	@echo "Checking OpenCode installation..."
	@which opencode > /dev/null 2>&1 && echo "✓ OpenCode is installed" || (echo "✗ OpenCode not found" && exit 1)

install:
	@if [ "$(TARGET)" = "opencode" ] && [ -z "$(DESTDIR)" ]; then $(MAKE) check-deps; fi
	@$(MAKE) build TARGET=$(TARGET)
	@bash scripts/install.sh "$(TARGET)" "$(DRY_RUN)" "$(DESTDIR)"
	@if [ "$(TARGET)" = "opencode" ]; then \
		echo ""; \
		echo "To verify, restart OpenCode and check agent list."; \
		echo "The default agent should be 'Nova Agent Squad'."; \
	fi

uninstall:
	@echo "Uninstalling Nova Agent Squad agents..."
	@rm -f ~/.config/opencode/agents/"Nova Agent Squad.md"
	@rm -f ~/.config/opencode/agents/nas_researcher.md
	@rm -f ~/.config/opencode/agents/nas_developer.md
	@rm -f ~/.config/opencode/agents/nas_qa.md
	@echo "✓ Agents removed from ~/.config/opencode/agents/"
	@echo ""
	@echo "Note: This removes only the agent files."
	@echo "To reset default_agent, edit ~/.config/opencode/opencode.json"

validate:
	@echo "Validating centralized agent structure..."
	@for agent in "Nova Agent Squad" nas_researcher nas_developer nas_qa; do \
		if [ -f "src/agents/$$agent.md" ]; then \
			echo "✓ src/agents/$$agent.md"; \
		else \
			echo "✗ src/agents/$$agent.md missing"; \
			exit 1; \
		fi; \
	done
	@echo ""
	@for file in src/agents/*.md; do \
		if ! head -20 "$$file" | grep -q "^---"; then \
			echo "✗ $$file missing frontmatter"; \
			exit 1; \
		fi; \
	done
	@if [ -d "dist/platforms/opencode/agents" ]; then \
		echo "Validating built artifacts under dist/platforms/opencode/agents..."; \
		for agent in "Nova Agent Squad" nas_researcher nas_developer nas_qa; do \
			if [ -f "dist/platforms/opencode/agents/$$agent.md" ]; then \
				echo "✓ dist/platforms/opencode/agents/$$agent.md"; \
			else \
				echo "✗ dist/platforms/opencode/agents/$$agent.md missing"; \
				exit 1; \
			fi; \
		done; \
	fi
	@echo "✓ Agent files have valid centralized structure"
	@echo ""
	@echo "Validation complete!"

doctor:
	@bash scripts/doctor.sh

test:
	@$(MAKE) build TARGET=opencode
	@bash tests/centralized_architecture_contract_test.sh
	@bash tests/final_cleanup_contract_test.sh
	@bash tests/multiplatform_install_contract_test.sh
	@bash tests/hybrid_confirmations_contract_test.sh
	@bash tests/rename_nova_nas_contract_test.sh
	@bash tests/steps_policy_contract_test.sh
	@bash tests/orchestrator_question_limit_contract_test.sh
	@bash tests/native_subagents_contract_test.sh
	@bash tests/doctor_contract_test.sh
	@bash tests/make_help_targets_contract_test.sh
