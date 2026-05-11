export const SAMPLE_SIMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" name="Simple" pageWidth="595" pageHeight="842" columnWidth="555" leftMargin="20" rightMargin="20" topMargin="20" bottomMargin="20" uuid="11111111-1111-1111-1111-111111111111">
  <parameter name="Title" class="java.lang.String"/>
  <queryString><![CDATA[SELECT id, name FROM users]]></queryString>
  <field name="id" class="java.lang.Integer"/>
  <field name="name" class="java.lang.String"/>
  <title>
    <band height="60" splitType="Stretch">
      <staticText>
        <reportElement x="0" y="0" width="555" height="40" uuid="22222222-2222-2222-2222-222222222222"/>
        <textElement textAlignment="Center"><font size="20" isBold="true"/></textElement>
        <text><![CDATA[User Report]]></text>
      </staticText>
      <line>
        <reportElement x="0" y="50" width="555" height="1" uuid="22222222-aaaa-2222-2222-222222222222"/>
      </line>
    </band>
  </title>
  <columnHeader>
    <band height="20">
      <staticText>
        <reportElement x="0" y="0" width="100" height="20" uuid="33333333-3333-3333-3333-333333333333"/>
        <textElement><font isBold="true"/></textElement>
        <text><![CDATA[ID]]></text>
      </staticText>
      <staticText>
        <reportElement x="100" y="0" width="455" height="20" uuid="44444444-4444-4444-4444-444444444444"/>
        <textElement><font isBold="true"/></textElement>
        <text><![CDATA[Name]]></text>
      </staticText>
    </band>
  </columnHeader>
  <detail>
    <band height="22">
      <textField>
        <reportElement x="0" y="0" width="100" height="20" uuid="55555555-5555-5555-5555-555555555555"/>
        <textFieldExpression><![CDATA[$F{id}]]></textFieldExpression>
      </textField>
      <textField>
        <reportElement x="100" y="0" width="455" height="20" uuid="66666666-6666-6666-6666-666666666666"/>
        <textFieldExpression><![CDATA[$F{name}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
  <pageFooter>
    <band height="20">
      <line>
        <reportElement x="0" y="0" width="555" height="1" uuid="77777777-7777-7777-7777-777777777777"/>
      </line>
      <textField>
        <reportElement x="455" y="4" width="100" height="14" uuid="77777777-aaaa-7777-7777-777777777777"/>
        <textElement textAlignment="Right"/>
        <textFieldExpression><![CDATA[$V{PAGE_NUMBER}]]></textFieldExpression>
      </textField>
    </band>
  </pageFooter>
</jasperReport>`;

export const SAMPLE_TABLE = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" name="TableSample" pageWidth="595" pageHeight="842" columnWidth="555" leftMargin="20" rightMargin="20" topMargin="20" bottomMargin="20" uuid="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee">
  <subDataset name="Users" uuid="11111111-2222-3333-4444-555555555555">
    <field name="id" class="java.lang.Integer"/>
    <field name="name" class="java.lang.String"/>
  </subDataset>
  <field name="id" class="java.lang.Integer"/>
  <field name="name" class="java.lang.String"/>
  <title>
    <band height="40">
      <staticText>
        <reportElement x="0" y="0" width="555" height="30" uuid="title-st"/>
        <textElement textAlignment="Center"><font size="18" isBold="true"/></textElement>
        <text><![CDATA[User Report (Table)]]></text>
      </staticText>
    </band>
  </title>
  <detail>
    <band height="100">
      <componentElement>
        <reportElement x="0" y="0" width="555" height="100" uuid="99999999-8888-7777-6666-555555555555"/>
        <jr:table xmlns:jr="http://jasperreports.sourceforge.net/jasperreports/components" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports/components http://jasperreports.sourceforge.net/xsd/components.xsd">
          <datasetRun subDataset="Users"/>
          <jr:column width="100" uuid="col-1">
            <jr:columnHeader height="20">
              <staticText>
                <reportElement x="0" y="0" width="100" height="20" uuid="ch-1"/>
                <text><![CDATA[ID]]></text>
              </staticText>
            </jr:columnHeader>
            <jr:detailCell height="20">
              <textField>
                <reportElement x="0" y="0" width="100" height="20" uuid="dc-1"/>
                <textFieldExpression><![CDATA[$F{id}]]></textFieldExpression>
              </textField>
            </jr:detailCell>
          </jr:column>
          <jr:column width="455" uuid="col-2">
            <jr:columnHeader height="20">
              <staticText>
                <reportElement x="0" y="0" width="455" height="20" uuid="ch-2"/>
                <text><![CDATA[Name]]></text>
              </staticText>
            </jr:columnHeader>
            <jr:detailCell height="20">
              <textField>
                <reportElement x="0" y="0" width="455" height="20" uuid="dc-2"/>
                <textFieldExpression><![CDATA[$F{name}]]></textFieldExpression>
              </textField>
            </jr:detailCell>
          </jr:column>
        </jr:table>
      </componentElement>
    </band>
  </detail>
</jasperReport>`;
