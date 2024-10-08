import ts from 'typescript';

/**
 * TypeScript Adapter used during the rollup process. It intercepts specific decorators to perform modification in the
 * resulting final JavaScript code. Currently it processes the following decorator:
 *
 * - @lazy: makes the field lazy by introducing a get accessor that initializes the property on the first use.
 */
export class CodeAdapter {
    private static readonly LAZY_ANNOTATION: string = '@lazy';

    public beforeCompilation(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
        return (sourceFile) => {
            const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
                if (ts.isPropertyDeclaration(node) && this.isDecorated(node, CodeAdapter.LAZY_ANNOTATION)) {
                    // Intercept @lazy
                    if (node.initializer === undefined) {
                        console.log('Field %s cannot be lazy: it has no initializer. Skipping.', node.name.getText());
                        return node;
                    }

                    console.log('Creating a lazy property for field %s.', node.name.getText());

                    const nodeFactory = context.factory;
                    const fieldName = '_' + this.snakeToCamel(node.name.getText());
                    const modifiers = ts.getModifiers(node)?.filter((m) => m.kind !== ts.SyntaxKind.ReadonlyKeyword);

                    const fieldAccessExpression: ts.Expression = nodeFactory.createPropertyAccessExpression(
                        nodeFactory.createThis(),
                        fieldName
                    );

                    const lazyNodes: ts.Node[] = [];

                    // Declaration node
                    lazyNodes.push(
                        nodeFactory.createPropertyDeclaration(
                            modifiers,
                            fieldName,
                            node.questionToken ?? node.exclamationToken,
                            node.type,
                            nodeFactory.createIdentifier('undefined')
                        )
                    );

                    // Getter node
                    lazyNodes.push(
                        nodeFactory.createGetAccessorDeclaration(
                            modifiers,
                            node.name.getText(),
                            [],
                            node.type,
                            nodeFactory.createBlock(
                                [
                                    // Create code if (field === undefined) { field = <initializer> }
                                    nodeFactory.createIfStatement(
                                        nodeFactory.createStrictEquality(
                                            fieldAccessExpression,
                                            nodeFactory.createIdentifier('undefined')
                                        ),
                                        nodeFactory.createBlock(
                                            [
                                                nodeFactory.createExpressionStatement(
                                                    nodeFactory.createAssignment(
                                                        fieldAccessExpression,
                                                        node.initializer
                                                    )
                                                ),
                                            ],
                                            true
                                        ),
                                        undefined
                                    ),
                                    // Create return field statement
                                    nodeFactory.createReturnStatement(fieldAccessExpression),
                                ],
                                true
                            )
                        )
                    );

                    // Setter, if needed
                    if (ts.getModifiers(node)?.find((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) === undefined) {
                        lazyNodes.push(
                            nodeFactory.createSetAccessorDeclaration(
                                modifiers,
                                node.name.getText(),
                                [
                                    nodeFactory.createParameterDeclaration(
                                        undefined,
                                        undefined,
                                        'value',
                                        undefined,
                                        node.type,
                                        undefined
                                    ),
                                ],
                                nodeFactory.createBlock(
                                    [
                                        nodeFactory.createExpressionStatement(
                                            nodeFactory.createAssignment(
                                                fieldAccessExpression,
                                                nodeFactory.createIdentifier('value')
                                            )
                                        ),
                                    ],
                                    true
                                )
                            )
                        );
                    }

                    return lazyNodes;
                }

                return ts.visitEachChild(node, visitor, context);
            };

            return ts.visitNode(sourceFile, visitor);
        };
    }

    private isDecorated(node: ts.ClassDeclaration | ts.PropertyDeclaration, decorator: string): boolean {
        const decorators = ts.getDecorators(node) ?? [];
        if (decorators.length === 0) {
            return false;
        }

        return decorators.find((n) => n.getText() === decorator) !== undefined;
    }

    private snakeToCamel(str: string): string {
        return str
            .toLowerCase()
            .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
    }
}
