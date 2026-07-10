<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:math="http://www.w3.org/2005/xpath-functions/math"
    xmlns:xd="http://www.oxygenxml.com/ns/doc/xsl"
    xmlns:ash="http://ashluvzu.com"
    xmlns="http://www.w3.org/2000/svg"
    exclude-result-prefixes="xs math xd"
    version="3.0">
    
    <!-- ebb: Let's pretty-print the output. The xsl:output line helps for that. -->
    <xsl:output method="xml" indent="yes"/>   
    
  <!-- ebb: Setting aside for now.
      We can make this a working function in the ashluvzu namespace now that we figured out the logic. 
      But we can develop it later. 
      <xsl:function name="ash:dateConverter">
        <xsl:param name="dateInfo"/>
        <xsl:value-of select="$dateInfo"/>
        
        
        <xsl:variable name="BCYears">
         <xsl:for-each select="$dateInfo[era='BC']">
             <xsl:value-of select="'-' || child::year ! number()"/>
         </xsl:for-each>
        </xsl:variable> 
    </xsl:function>-->
    
    
    
    <xsl:template match="/">

        <xsl:variable name="x-spacer" select="10"/>
        <svg width="25000" viewBox="0 0 25000 400">
            <xsl:variable name="allDates" as="element()+" select="//date"/>
            
        <xsl:variable name="BC-dates" as="item()+">
                <xsl:for-each select="$allDates[era='BC']">
                    <xsl:value-of select="current() ! '-' || child::year ! number()"/>
                </xsl:for-each>
        </xsl:variable>
            
            <xsl:variable name="AD-dates" as="item()+">
                <xsl:for-each select="$allDates[not(era = 'BC')]">
                    <xsl:value-of select="current()/child::year ! number()"/>
                </xsl:for-each>
            </xsl:variable>
            
      <xsl:variable name="allConvertedDates" select="(($BC-dates), ($AD-dates))"/>
            
        
         
            <xsl:variable name="latestDate" select="max($allConvertedDates)"/>
            
            <xsl:variable name="earliestDate" select="min($allConvertedDates)"/>
            
          <desc> HI! I'm the latest date: <xsl:value-of select="$latestDate"/></desc>
            
            <desc>And I'm the earliest date: <xsl:value-of select="$earliestDate"/>  </desc>-->


   <g transform="translate({abs($earliestDate) * $x-spacer + 10}, 0)">
       <rect width="{($latestDate - $earliestDate) * $x-spacer}" height="220" x="{$earliestDate * $x-spacer}" y="10" rx="20" ry="20" fill="#985AB7"/>
       
       
            
         
         
         <!-- ebb: This outputs every single date.-->
            <xsl:for-each select="$allConvertedDates">
                <g class="datePoint">
                    <circle r="20" cx="{current() * $x-spacer}" cy="90" fill="red" />
                    </g>
            </xsl:for-each>
       
          <xsl:for-each select="xs:integer($earliestDate) to xs:integer($latestDate)">
              
              <xsl:if test="current() mod 100 = 0">
                  <!-- ebb: I'm taking each integer, and if it's divisible by 100 without a remainder, or
                  mod="0", then I'm letting us output a line. This should give us vertical black lines 
                  for every century. "mod" means modulo. and you can use it to output if a number is evenly divisible by
                  2 or 5 or 10 or whatever, its mod is 0.-->
                  
                  <line x1="{current() * $x-spacer}" y1="10" 
                        x2="{current() * $x-spacer}" y2="200" 
                        stroke="white" stroke-width="15"/>
                  <!-- ebb: Here's an SVG text element to output the current value. -->
                  <text x="{current() * $x-spacer}" y="0"><xsl:value-of select="current()"/></text>
              </xsl:if>
              
              <!-- Here's one that makes 50 year increments, Same as above, just mod 50 = 0-->
              
              <xsl:if test="current() mod 50 = 0">
                  <!-- ebb: I'm taking each integer, and if it's divisible by 100 without a remainder, or
                  mod="0", then I'm letting us output a line. This should give us vertical black lines 
                  for every century. "mod" means modulo. and you can use it to output if a number is evenly divisible by
                  2 or 5 or 10 or whatever, its mod is 0.-->
                  
                  <line x1="{current() * $x-spacer}" y1="10" 
                      x2="{current() * $x-spacer}" y2="150" 
                      stroke="white" stroke-width="10" stroke-length=""/>
                  <!-- ebb: Here's an SVG text element to output the current value. -->
                  <text x="{current() * $x-spacer}" y="0"><xsl:value-of select="current()"/></text>
              </xsl:if>
              
              <xsl:if test="current() mod 10 = 0">
                  <!-- ebb: I'm taking each integer, and if it's divisible by 100 without a remainder, or
                  mod="0", then I'm letting us output a line. This should give us vertical black lines 
                  for every century. "mod" means modulo. and you can use it to output if a number is evenly divisible by
                  2 or 5 or 10 or whatever, its mod is 0.-->
                  
                  <line x1="{current() * $x-spacer}" y1="10" 
                      x2="{current() * $x-spacer}" y2="100" 
                      stroke="white" stroke-width="5"/>
                  <!-- ebb: Here's an SVG text element to output the current value. -->
                  <text x="{current() * $x-spacer}" y="0"><xsl:value-of select="current()"/></text>
              </xsl:if>
              
              <xsl:if test="current() mod 5 = 0">
                  <!-- ebb: I'm taking each integer, and if it's divisible by 100 without a remainder, or
                  mod="0", then I'm letting us output a line. This should give us vertical black lines 
                  for every century. "mod" means modulo. and you can use it to output if a number is evenly divisible by
                  2 or 5 or 10 or whatever, its mod is 0.-->
                  
                  <line x1="{current() * $x-spacer}" y1="10" 
                      x2="{current() * $x-spacer}" y2="50" 
                      stroke="white" stroke-width="2"/>
                  <!-- ebb: Here's an SVG text element to output the current value. -->
                  <text x="{current() * $x-spacer}" y="0"><xsl:value-of select="current()"/></text>
              </xsl:if>
      
              
          </xsl:for-each>
       
            
   </g> 
        </svg>
    </xsl:template>
</xsl:stylesheet>