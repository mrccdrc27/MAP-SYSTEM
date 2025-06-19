      {/* Flow Visualization Section */}
      <div className={styles.flowVisualizationSection}>
        <h2 className={styles.sectionTitle}>Complete Workflow Flow</h2>
        {flowVisualization.length > 0 ? (
          <div className={styles.flowContainer}>
            {flowVisualization.map((flowItem) => (
              <div key={flowItem.step.step_id} className={styles.flowItem}>
                {/* Step Node */}
                <div className={`${styles.flowStep} ${!flowItem.hasIncoming ? styles.startStep : ''} ${!flowItem.hasOutgoing ? styles.endStep : ''}`}>
                  <div className={styles.flowStepHeader}>
                    <span className={styles.flowStepOrder}>{flowItem.step.order}</span>
                    <span className={styles.flowStepName}>{flowItem.step.name}</span>
                    {!flowItem.hasIncoming && <span className={styles.startBadge}>START</span>}
                  </div>
                  <div className={styles.flowStepRole}>
                    {getRoleName(flowItem.step.role_id)}
                  </div>
                </div>

                {/* All transitions from this step */}
                {flowItem.transitions.length > 0 ? (
                  <div className={styles.flowConnections}>
                    {flowItem.transitions.map((transition) => (
                      <div key={transition.transition_id} className={styles.flowConnection}>
                        <div className={styles.flowArrow}>
                          <div className={styles.flowActionLabel}>
                            {getActionName(transition.action_id)}
                          </div>
                          <div className={styles.arrowLine}>
                            <div className={styles.arrowHead}>→</div>
                          </div>
                        </div>
                        {/* Show target step if it exists */}
                        {transition.to_step_id ? (
                          <div className={styles.flowTargetStep}>
                            <span className={styles.targetStepName}>{getStepName(transition.to_step_id)}</span>
                            <span className={styles.targetStepOrder}>
                              (Step {steps.find(s => s.step_id === transition.to_step_id)?.order})
                            </span>
                          </div>
                        ) : (
                          <div className={styles.flowEndNode}>
                            <span className={styles.flowEndText}>🏁 END</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.flowConnections}>
                    <div className={styles.flowConnection}>
                      <div className={styles.flowArrow}>
                        <div className={styles.noActionLabel}>No actions defined</div>
                        <div className={styles.arrowLine}>
                          <div className={styles.arrowHead}>→</div>
                        </div>
                      </div>
                      <div className={styles.flowEndNode}>
                        <span className={styles.flowEndText}>🏁 END</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Incoming transitions indicator */}
                {flowItem.hasIncoming && (
                  <div className={styles.incomingIndicator}>
                    <span className={styles.incomingCount}>
                      {transitions.filter(t => t.to_step_id === flowItem.step.step_id).length} incoming transition(s)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyFlow}>
            <p>No workflow steps to display. Add steps and transitions to see the complete flow visualization.</p>
          </div>
        )}
      </div>
